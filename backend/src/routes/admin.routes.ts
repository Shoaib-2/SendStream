import express, { Request, Response, RequestHandler } from 'express';
import Stripe from 'stripe';
import User from '../models/User';
import { logger } from '../utils/logger';
import { protect } from '../middleware/auth/auth.middleware';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

/**
 * GET /api/admin/check-trial-eligibility
 * Check if user is eligible for trial
 */
const checkTrialEligibility: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = req.query.email as string;
    
    if (!email) {
      res.status(400).json({ status: 'error', message: 'Email is required' });
      return;
    }
    
    const user = await User.findOne({ email });
    
    const stripeData = { 
      hasCustomer: false, 
      hasSubscriptions: false,
      subscriptionCount: 0
    };
    
    try {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      
      if (customers.data && customers.data.length > 0) {
        const customerId = customers.data[0].id;
        stripeData.hasCustomer = true;
        
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 100,
          status: 'all'
        });
        
        stripeData.hasSubscriptions = subscriptions.data.length > 0;
        stripeData.subscriptionCount = subscriptions.data.length;
      }
    } catch (stripeError) {
      logger.error('Error checking Stripe:', stripeError);
    }
    
    const hasActiveTrial = user?.trialEndsAt && new Date(user.trialEndsAt) > new Date();
    const hasPastSubscription = stripeData.hasSubscriptions;
    const isMarkedTrialUsed = user?.trialUsed === true;
    
    const eligibleForTrial = !hasActiveTrial && !hasPastSubscription && !isMarkedTrialUsed;
    
    let reason = null;
    if (!eligibleForTrial) {
      if (hasActiveTrial) {
        reason = 'User has an active trial';
      } else if (hasPastSubscription) {
        reason = 'User has previous subscription history';
      } else if (isMarkedTrialUsed) {
        reason = 'User has already used their trial';
      }
    }
    
    res.status(200).json({
      status: 'success',
      eligibleForTrial,
      hasActiveTrial,
      hasPastSubscription,
      isMarkedTrialUsed,
      userData: user ? {
        email: user.email,
        trialUsed: user.trialUsed,
        trialEndsAt: user.trialEndsAt,
        subscriptionStatus: user.subscriptionStatus
      } : null,
      stripeCheck: stripeData,
      reason,
      trialData: user?.trialEndsAt ? {
        trialEndsAt: user.trialEndsAt,
        trialRemaining: Math.max(0, Math.floor((new Date(user.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
        isActive: new Date(user.trialEndsAt) > new Date()
      } : null
    });
  } catch (error) {
    logger.error('Error in check-trial-eligibility:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error',
      error: (error as Error).message 
    });
  }
};

/**
 * POST /api/admin/refresh-trial-status
 * Refresh trial status for a user
 */
const refreshTrialStatus: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }
    
    let stripeHasSubscription = false;
    
    try {
      if (user.stripeCustomerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          limit: 100,
          status: 'all'
        });
        
        stripeHasSubscription = subscriptions.data.length > 0;
      } else {
        const customers = await stripe.customers.list({
          email: email,
          limit: 1
        });
        
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id;
          
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            limit: 100,
            status: 'all'
          });
          
          stripeHasSubscription = subscriptions.data.length > 0;
        }
      }
    } catch (stripeError) {
      logger.error('Error checking Stripe:', stripeError);
    }
    
    const updateData: Record<string, unknown> = {};
    
    updateData.trialUsed = user.trialUsed || 
                          stripeHasSubscription || 
                          (user.trialEndsAt && new Date(user.trialEndsAt) < new Date());
    
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Trial status refreshed',
      previousTrialUsed: user.trialUsed,
      newTrialUsed: updatedUser?.trialUsed,
      hadSubscriptionInStripe: stripeHasSubscription
    });
  } catch (error) {
    logger.error('Error refreshing trial status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to refresh trial status',
      error: (error as Error).message
    });
  }
};

/**
 * POST /api/admin/refresh-subscription-status
 * Manually refresh subscription status from Stripe for a specific user
 */
const refreshSubscriptionStatus: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ status: 'error', message: 'Email is required' });
      return;
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      res.status(404).json({ status: 'error', message: 'User not found' });
      return;
    }
    
    logger.info(`Refreshing subscription status for user: ${email}`);
    
    // Get customer ID from user or search Stripe
    let customerId = user.stripeCustomerId;
    
    if (!customerId) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logger.info(`Found Stripe customer: ${customerId}`);
      } else {
        res.status(404).json({ 
          status: 'error', 
          message: 'No Stripe customer found for this email' 
        });
        return;
      }
    }
    
    // Get all subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 100,
      status: 'all'
    });
    
    logger.info(`Found ${subscriptions.data.length} subscriptions for customer ${customerId}`);
    
    // Find the most recent active subscription
    const activeSubscription = subscriptions.data.find(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );
    
    const updateData: Record<string, unknown> = {
      stripeCustomerId: customerId,
      updatedAt: new Date()
    };
    
    if (activeSubscription) {
      updateData.stripeSubscriptionId = activeSubscription.id;
      updateData.subscriptionStatus = activeSubscription.status;
      updateData.status = 'active';
      
      logger.info(`Active subscription found: ${activeSubscription.id}, status: ${activeSubscription.status}`);
      
      const updatedUser = await User.findOneAndUpdate(
        { email },
        updateData,
        { new: true }
      );
      
      res.status(200).json({
        status: 'success',
        message: 'Subscription status refreshed successfully',
        data: {
          email: updatedUser?.email,
          stripeCustomerId: updatedUser?.stripeCustomerId,
          stripeSubscriptionId: updatedUser?.stripeSubscriptionId,
          subscriptionStatus: updatedUser?.subscriptionStatus,
          hasActiveAccess: updatedUser?.hasActiveAccess
        }
      });
    } else {
      // No active subscription found
      updateData.subscriptionStatus = 'canceled';
      
      logger.info('No active subscription found');
      
      const updatedUser = await User.findOneAndUpdate(
        { email },
        updateData,
        { new: true }
      );
      
      res.status(200).json({
        status: 'success',
        message: 'No active subscription found',
        data: {
          email: updatedUser?.email,
          stripeCustomerId: updatedUser?.stripeCustomerId,
          subscriptionStatus: updatedUser?.subscriptionStatus,
          hasActiveAccess: updatedUser?.hasActiveAccess,
          totalSubscriptions: subscriptions.data.length,
          subscriptionStatuses: subscriptions.data.map(s => ({
            id: s.id,
            status: s.status,
            created: new Date(s.created * 1000)
          }))
        }
      });
    }
  } catch (error) {
    logger.error('Error refreshing subscription status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to refresh subscription status',
      error: (error as Error).message
    });
  }
};

/**
 * POST /api/admin/fix-trial-records
 * Fix trial records for all users (Admin only)
 */
const fixTrialRecords: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    
    // Check if user is admin
    if (authReq.user?.role !== 'admin') {
      res.status(403).json({ error: 'Unauthorized - Admin only' });
      return;
    }
    
    const users = await User.find({});
    
    const results = {
      total: users.length,
      updated: 0,
      withStripeSubscription: 0,
      withTrialEndsAt: 0,
      errors: 0
    };
    
    for (const user of users) {
      try {
        const updateData: Record<string, unknown> = {};
        let needsUpdate = false;
        
        if (user.trialEndsAt && !user.trialUsed) {
          updateData.trialUsed = true;
          needsUpdate = true;
          results.withTrialEndsAt++;
        }
        
        if (user.stripeSubscriptionId && !user.trialUsed) {
          updateData.trialUsed = true;
          needsUpdate = true;
          results.withStripeSubscription++;
        }
        
        if (!needsUpdate && user.email) {
          try {
            const customers = await stripe.customers.list({
              email: user.email,
              limit: 1
            });
            
            if (customers.data.length > 0) {
              const customerId = customers.data[0].id;
              
              const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                limit: 100,
                status: 'all'
              });
              
              if (subscriptions.data.length > 0) {
                updateData.trialUsed = true;
                updateData.stripeCustomerId = updateData.stripeCustomerId || customerId;
                
                if (!user.stripeSubscriptionId && subscriptions.data[0].id) {
                  updateData.stripeSubscriptionId = subscriptions.data[0].id;
                }
                
                needsUpdate = true;
              }
            }
          } catch (stripeError) {
            logger.error(`Stripe error for user ${user.email}:`, stripeError);
          }
        }
        
        if (needsUpdate) {
          await User.findByIdAndUpdate(user._id, updateData);
          results.updated++;
        }
      } catch (userError) {
        logger.error(`Error processing user ${user.email}:`, userError);
        results.errors++;
      }
    }
    
    res.status(200).json({
      status: 'success',
      results
    });
  } catch (error) {
    logger.error('Error fixing trial records:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fix trial records',
      error: (error as Error).message
    });
  }
};

// Route definitions
// Unauthenticated routes (must come BEFORE protect middleware)
router.post('/refresh-subscription-status', refreshSubscriptionStatus);

// Protected routes
router.use(protect as RequestHandler);
router.get('/check-trial-eligibility', checkTrialEligibility);
router.post('/refresh-trial-status', refreshTrialStatus);
router.post('/fix-trial-records', fixTrialRecords);

export default router;
