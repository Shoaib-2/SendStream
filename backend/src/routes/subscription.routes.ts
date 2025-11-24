import express, { RequestHandler } from 'express';
import { protect } from '../middleware/auth/auth.middleware';
import Stripe from 'stripe';
import User from '../models/User';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const router = express.Router();

// Check if the API key exists before initializing Stripe
const stripeApiKey = process.env.STRIPE_SECRET_KEY;
if (!stripeApiKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required but not configured');
}

// Initialize Stripe
const stripe = new Stripe(stripeApiKey, {
  apiVersion: '2025-02-24.acacia',
});

// Define interfaces for request bodies
interface TrialSessionRequest {
  email: string;
}

interface UpdateRenewalRequest {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}

// Public routes (no auth required)
const createTrialSession: RequestHandler = async (req, res, _next): Promise<void> => {
  try {
    const { email } = req.body as TrialSessionRequest;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }    // Check if price ID exists
    const stripePriceId = process.env.STRIPE_PRICE_ID;
    if (!stripePriceId) {
      console.error('STRIPE_PRICE_ID environment variable is not configured');
      res.status(500).json({
        status: 'error',
        message: 'Stripe configuration error'
      });
      return;
    }

    // Create a checkout session for trial
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      success_url: `${process.env.CLIENT_URL}/auth/signup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}`,
      subscription_data: {
        trial_period_days: 14,
      },
      line_items: [{
        price: stripePriceId,
        quantity: 1,
      }],
    });

    res.status(200).json({
      status: 'success',
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating trial session:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create trial session'
    });
  }
};

// Protected routes handlers
const getSubscriptionStatus: RequestHandler = async (req, res, _next): Promise<void> => {
  // Check if user exists in request
  if (!req.user || !req.user.id) {
    res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
    return;
  }
  
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }
    
    // @ts-ignore - Ignore TypeScript checking for properties
    if (!user.stripeSubscriptionId) {
      res.status(200).json({
        status: 'success',
        data: { hasSubscription: false, subscription: null }
      });
      return;
    }
    
    try {
      // @ts-ignore - Ignore TypeScript checking for properties
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
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
    } catch (stripeError) {
      console.error('Error retrieving Stripe subscription:', stripeError);
      
      res.status(200).json({
        status: 'success',
        data: {
          hasSubscription: true,
          subscription: {
            // @ts-ignore - Ignore TypeScript checking for properties
            id: user.stripeSubscriptionId,
            // @ts-ignore - Ignore TypeScript checking for properties
            status: user.subscriptionStatus,
            // @ts-ignore - Ignore TypeScript checking for properties
            trialEnd: user.trialEndsAt
          },
          error: 'Could not retrieve complete subscription details'
        }
      });
    }
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get subscription status'
    });
  }
};

const cancelSubscription: RequestHandler = async (req, res, _next): Promise<void> => {
  // Check if user exists in request
  if (!req.user || !req.user.id) {
    res.status(401).json({
      status: 'error',
      message: 'Not authenticated',
      code: 'NOT_AUTHENTICATED'
    });
    return;
  }
  
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }
    
    // @ts-ignore - Ignore TypeScript checking for properties
    if (!user.stripeSubscriptionId) {
      res.status(400).json({ status: 'error', message: 'No active subscription found' });
      return;
    }
    
    try {
      // First check if subscription is already canceled
      try {
        // @ts-ignore - Ignore TypeScript checking for properties
        const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        if (existingSubscription.status === 'canceled') {
          // Update user status if needed
          // @ts-ignore - Ignore TypeScript checking for properties
          if (user.subscriptionStatus !== 'canceled') {
            // @ts-ignore - Ignore TypeScript checking for properties
            user.subscriptionStatus = 'canceled';
            await user.save();
          }
          
          res.status(200).json({
            status: 'success',
            data: {
              message: 'Subscription already canceled',
              willEndOn: new Date(existingSubscription.current_period_end * 1000)
            }
          });
          return;
        }
      } catch (retrieveError) {
        // Continue with cancel attempt if retrieve fails
        console.error('Error retrieving subscription:', retrieveError);
      }
      
      // @ts-ignore - Ignore TypeScript checking for properties
      const subscription = await stripe.subscriptions.update(
        user.stripeSubscriptionId,
        { cancel_at_period_end: true }
      );
      
      // @ts-ignore - Ignore TypeScript checking for properties
      user.subscriptionStatus = subscription.status;
      await user.save();
      
      res.status(200).json({
        status: 'success',
        data: {
          message: 'Subscription canceled successfully',
          willEndOn: new Date(subscription.current_period_end * 1000)
        }
      });
    } catch (stripeError) {
      console.error('Error canceling Stripe subscription:', stripeError);
      
      // Handle the specific error for canceled subscriptions
      // @ts-ignore
      if (stripeError.type === 'StripeInvalidRequestError' && 
          // @ts-ignore
          stripeError.raw?.message?.includes('canceled subscription')) {
        
        // Update user's status
        // @ts-ignore
        user.subscriptionStatus = 'canceled';
        await user.save();
        
        res.status(200).json({
          status: 'success',
          data: {
            message: 'Subscription already canceled',
            // @ts-ignore
            willEndOn: user.trialEndsAt || new Date()
          }
        });
        return;
      }
      
      res.status(400).json({
        status: 'error',
        message: 'Failed to cancel subscription with Stripe'
      });
    }
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel subscription'
    });
  }
};

const updateRenewal: RequestHandler = async (req, res, _next): Promise<void> => {
  // Check if user exists in request
  if (!req.user || !req.user.id) {
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
    const user = await User.findById(req.user.id);
    
    if (!user) {
      res.status(404).json({ 
        status: 'error', 
        message: 'User not found' 
      });
      return;
    }
    
    // @ts-ignore - Ignore TypeScript checking for properties
    if (user.stripeSubscriptionId !== subscriptionId) {
      res.status(403).json({
        status: 'error',
        message: 'Subscription does not belong to this user'
      });
      return;
    }
    
    try {
      // First check subscription status to avoid errors with canceled subscriptions
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      // If subscription is already canceled, we can't modify cancel_at_period_end
      if (subscription.status === 'canceled') {
        // Just return success with the current details
        res.status(200).json({
          status: 'success',
          data: {
            subscription: {
              id: subscription.id,
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
              cancelAtPeriodEnd: true // Canceled subscriptions are effectively cancelAtPeriodEnd
            }
          },
          message: 'No changes needed - subscription is already canceled'
        });
        return;
      }
      
      // Only update if the subscription is active or trialing
      const updatedSubscription = await stripe.subscriptions.update(
        subscriptionId,
        { cancel_at_period_end: cancelAtPeriodEnd }
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
      console.error('Error updating subscription in Stripe:', stripeError);
      
      res.status(400).json({
        status: 'error',
        message: 'Failed to update subscription settings in Stripe'
      });
    }
  } catch (error) {
    console.error('Error updating subscription renewal:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Failed to update subscription renewal settings'
    });
  }
};

// Route definitions
router.post('/create-trial-session', createTrialSession as RequestHandler);

// Protected routes - explicit type casting for middleware
router.use(protect as RequestHandler);
router.get('/status', getSubscriptionStatus as RequestHandler);
router.post('/cancel', cancelSubscription as RequestHandler);
router.post('/update-renewal', updateRenewal as RequestHandler);

export default router;