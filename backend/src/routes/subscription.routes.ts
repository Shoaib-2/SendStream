import express, { RequestHandler, Request, Response } from 'express';
import { protect } from '../middleware/auth/auth.middleware';
import User, { IUser } from '../models/User';
import stripeService from '../services/Integrations/stripe';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Define interfaces for request bodies
interface TrialSessionRequest {
  email: string;
  skipTrial?: boolean;
}

interface UpdateRenewalRequest {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}

// Extend Express Request type to include user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * PUBLIC ROUTE: Create Stripe checkout session for trial
 */
const createTrialSession: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, skipTrial } = req.body as TrialSessionRequest;
    
    if (!email) {
      res.status(400).json({ 
        status: 'error',
        message: 'Email is required' 
      });
      return;
    }

    const stripePriceId = process.env.STRIPE_PRICE_ID;
    if (!stripePriceId) {
      logger.error('STRIPE_PRICE_ID environment variable is not configured');
      res.status(500).json({
        status: 'error',
        message: 'Stripe configuration error'
      });
      return;
    }

    const successUrl = `${process.env.CLIENT_URL}/auth/signup?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.CLIENT_URL}`;

    const session = await stripeService.createCheckoutSession(
      stripePriceId,
      successUrl,
      cancelUrl,
      { email, skipTrial }
    );

    res.status(200).json({
      status: 'success',
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    logger.error('Error creating trial session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create trial session'
    });
  }
};

/**
 * PROTECTED ROUTE: Get subscription status for authenticated user
 */
const getSubscriptionStatus: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  
  if (!authReq.user?.id) {
    res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
    return;
  }
  
  // Add cache control headers to prevent stale data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  try {
    const user = await User.findById(authReq.user.id).lean<IUser>();
    
    if (!user) {
      res.status(404).json({ 
        status: 'error', 
        message: 'User not found' 
      });
      return;
    }
    
    // If no subscription ID saved, check if user has a subscription via customer ID
    if (!user.stripeSubscriptionId && user.stripeCustomerId) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
          apiVersion: '2025-02-24.acacia',
        });
        
        const customerSubscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          limit: 10
        });
        
        // Find an active or trialing subscription
        const validSubscription = customerSubscriptions.data.find(
          sub => sub.status === 'active' || sub.status === 'trialing'
        );
        
        if (validSubscription) {
          logger.info(`Found valid subscription ${validSubscription.id} for user ${user.email} via customer lookup`);
          
          // Update user with the found subscription
          await User.findByIdAndUpdate(authReq.user.id, {
            stripeSubscriptionId: validSubscription.id,
            subscriptionStatus: validSubscription.status,
            hasActiveAccess: true,
            trialEndsAt: validSubscription.trial_end 
              ? new Date(validSubscription.trial_end * 1000) 
              : undefined,
            updatedAt: new Date()
          });
          
          // Return the found subscription
          res.status(200).json({
            status: 'success',
            data: {
              hasSubscription: true,
              subscription: {
                id: validSubscription.id,
                status: validSubscription.status,
                currentPeriodEnd: new Date(validSubscription.current_period_end * 1000),
                cancelAtPeriodEnd: validSubscription.cancel_at_period_end,
                trialEnd: validSubscription.trial_end ? new Date(validSubscription.trial_end * 1000) : null
              }
            }
          });
          return;
        }
      } catch (lookupError) {
        logger.error('Error looking up customer subscriptions:', lookupError);
      }
    }
    
    if (!user.stripeSubscriptionId) {
      res.status(200).json({
        status: 'success',
        data: { 
          hasSubscription: false, 
          subscription: null 
        }
      });
      return;
    }
    
    try {
      const subscription = await stripeService.retrieveSubscription(user.stripeSubscriptionId);
      
      res.status(200).json({
        status: 'success',
        data: {
          hasSubscription: true,
          subscription: {
            id: subscription.id,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null
          }
        }
      });
    } catch (stripeError: any) {
      // Handle case where subscription doesn't exist in Stripe
      if (stripeError.type === 'StripeInvalidRequestError' && 
          stripeError.code === 'resource_missing') {
        logger.info(`Clearing invalid subscription ${user.stripeSubscriptionId} from database`);
        
        // Clear invalid subscription ID from database
        await User.findByIdAndUpdate(authReq.user.id, {
          stripeSubscriptionId: undefined,
          subscriptionStatus: null,
          hasActiveAccess: false
        });
        
        // IMPORTANT: Check if user has a NEWER subscription via customer ID
        // This handles the case where user renewed but webhook hasn't updated yet
        if (user.stripeCustomerId) {
          try {
            const Stripe = (await import('stripe')).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
              apiVersion: '2025-02-24.acacia',
            });
            
            const customerSubscriptions = await stripe.subscriptions.list({
              customer: user.stripeCustomerId,
              limit: 10
            });
            
            // Find an active or trialing subscription
            const validSubscription = customerSubscriptions.data.find(
              sub => sub.status === 'active' || sub.status === 'trialing'
            );
            
            if (validSubscription) {
              logger.info(`Found valid subscription ${validSubscription.id} after clearing invalid one for user via customer lookup`);
              
              // Update user with the found subscription
              await User.findByIdAndUpdate(authReq.user.id, {
                stripeSubscriptionId: validSubscription.id,
                subscriptionStatus: validSubscription.status,
                hasActiveAccess: true,
                trialEndsAt: validSubscription.trial_end 
                  ? new Date(validSubscription.trial_end * 1000) 
                  : undefined,
                updatedAt: new Date()
              });
              
              // Return the found subscription
              res.status(200).json({
                status: 'success',
                data: {
                  hasSubscription: true,
                  subscription: {
                    id: validSubscription.id,
                    status: validSubscription.status,
                    currentPeriodEnd: new Date(validSubscription.current_period_end * 1000),
                    cancelAtPeriodEnd: validSubscription.cancel_at_period_end,
                    trialEnd: validSubscription.trial_end ? new Date(validSubscription.trial_end * 1000) : null
                  }
                }
              });
              return;
            }
          } catch (lookupError) {
            logger.error('Error looking up customer subscriptions after clearing invalid:', lookupError);
          }
        }
        
        // No valid subscription found - return no subscription
        res.status(200).json({
          status: 'success',
          data: { 
            hasSubscription: false, 
            subscription: null 
          }
        });
        return;
      }
      
      // For other errors, return cached data from database
      res.status(200).json({
        status: 'success',
        data: {
          hasSubscription: true,
          subscription: {
            id: user.stripeSubscriptionId,
            status: user.subscriptionStatus,
            trialEnd: user.trialEndsAt
          },
          warning: 'Could not retrieve complete subscription details from Stripe'
        }
      });
    }
  } catch (error) {
    logger.error('Error getting subscription status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get subscription status'
    });
  }
};

/**
 * PROTECTED ROUTE: Cancel subscription at period end
 */
const cancelSubscription: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  
  if (!authReq.user?.id) {
    res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
    return;
  }
  
  try {
    const user = await User.findById(authReq.user.id).lean<IUser>();
    
    if (!user) {
      res.status(404).json({ 
        status: 'error', 
        message: 'User not found' 
      });
      return;
    }
    
    if (!user.stripeSubscriptionId) {
      res.status(400).json({ 
        status: 'error', 
        message: 'No active subscription found' 
      });
      return;
    }
    
    try {
      // Check if subscription is already canceled
      const existingSubscription = await stripeService.retrieveSubscription(user.stripeSubscriptionId);
      
      if (existingSubscription.status === 'canceled') {
        res.status(200).json({
          status: 'success',
          data: {
            message: 'Subscription already canceled',
            willEndOn: new Date(existingSubscription.current_period_end * 1000)
          }
        });
        return;
      }
      
      // Cancel the subscription
      const subscription = await stripeService.cancelSubscription(user.stripeSubscriptionId);
      
      res.status(200).json({
        status: 'success',
        data: {
          message: 'Subscription will be canceled at period end',
          willEndOn: new Date(subscription.current_period_end * 1000)
        }
      });
    } catch (stripeError: any) {
      logger.error('Error canceling Stripe subscription:', stripeError);
      
      // Handle already canceled subscription
      if (stripeError.type === 'StripeInvalidRequestError' && 
          stripeError.raw?.message?.includes('canceled')) {
        res.status(200).json({
          status: 'success',
          data: {
            message: 'Subscription already canceled',
            willEndOn: user.trialEndsAt || new Date()
          }
        });
        return;
      }
      
      res.status(400).json({
        status: 'error',
        message: 'Failed to cancel subscription'
      });
    }
  } catch (error) {
    logger.error('Error canceling subscription:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel subscription'
    });
  }
};

/**
 * PROTECTED ROUTE: Update subscription renewal settings
 */
const updateRenewal: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  const authReq = req as AuthRequest;
  
  if (!authReq.user?.id) {
    res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
    return;
  }
  
  const { subscriptionId, cancelAtPeriodEnd } = req.body as UpdateRenewalRequest;
  
  if (!subscriptionId) {
    res.status(400).json({
      status: 'error',
      message: 'Subscription ID is required'
    });
    return;
  }
  
  if (typeof cancelAtPeriodEnd !== 'boolean') {
    res.status(400).json({
      status: 'error',
      message: 'cancelAtPeriodEnd must be a boolean value'
    });
    return;
  }
  
  try {
    const user = await User.findById(authReq.user.id).lean<IUser>();
    
    if (!user) {
      res.status(404).json({ 
        status: 'error', 
        message: 'User not found' 
      });
      return;
    }
    
    if (user.stripeSubscriptionId !== subscriptionId) {
      res.status(403).json({
        status: 'error',
        message: 'Subscription does not belong to this user'
      });
      return;
    }
    
    try {
      // Check subscription status first
      const subscription = await stripeService.retrieveSubscription(subscriptionId);
      
      if (subscription.status === 'canceled') {
        res.status(200).json({
          status: 'success',
          data: {
            subscription: {
              id: subscription.id,
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: true
            }
          },
          message: 'No changes needed - subscription is already canceled'
        });
        return;
      }
      
      // Update renewal settings
      const updatedSubscription = await stripeService.updateSubscriptionRenewal(
        subscriptionId,
        cancelAtPeriodEnd
      );
      
      res.status(200).json({
        status: 'success',
        data: {
          subscription: {
            id: updatedSubscription.id,
            status: updatedSubscription.status,
            currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
            cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end
          }
        },
        message: cancelAtPeriodEnd ? 
          'Auto-renewal has been disabled' : 
          'Auto-renewal has been enabled'
      });
    } catch (stripeError) {
      logger.error('Error updating subscription in Stripe:', stripeError);
      
      res.status(400).json({
        status: 'error',
        message: 'Failed to update subscription settings'
      });
    }
  } catch (error) {
    logger.error('Error updating subscription renewal:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update subscription renewal settings'
    });
  }
};

// Route definitions
router.post('/create-trial-session', createTrialSession);

// Protected routes
router.use(protect as RequestHandler);
router.get('/status', getSubscriptionStatus);
router.post('/cancel', cancelSubscription);
router.post('/update-renewal', updateRenewal);

export default router;
