import express, { RequestHandler } from 'express';
import { protect } from '../middleware/auth/auth.middleware';
import Stripe from 'stripe';
import User from '../models/User';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-02-24.acacia' });

// Apply auth middleware to all routes
router.use(protect as RequestHandler);

// Get subscription status
router.get('/status', function(req, res) {
  const getUserStatus = async () => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }
      
      if (!(user as any).stripeSubscriptionId) {
        return res.status(200).json({
          status: 'success',
          data: { hasSubscription: false, subscription: null }
        });
      }
      
      try {
        const subscription = await stripe.subscriptions.retrieve((user as any).stripeSubscriptionId);
        
        return res.status(200).json({
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
        
        return res.status(200).json({
          status: 'success',
          data: {
            hasSubscription: true,
            subscription: {
              id: (user as any).stripeSubscriptionId,
              status: (user as any).subscriptionStatus,
              trialEnd: (user as any).trialEndsAt
            },
            error: 'Could not retrieve complete subscription details'
          }
        });
      }
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to get subscription status'
      });
    }
  };

  getUserStatus();
});

// Cancel subscription
router.post('/cancel', function(req, res) {
  const cancelUserSubscription = async () => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }
      
      if (!(user as any).stripeSubscriptionId) {
        return res.status(400).json({ status: 'error', message: 'No active subscription found' });
      }
      
      try {
        const subscription = await stripe.subscriptions.update(
          (user as any).stripeSubscriptionId,
          { cancel_at_period_end: true }
        );
        
        (user as any).subscriptionStatus = subscription.status;
        await user.save();
        
        return res.status(200).json({
          status: 'success',
          data: {
            message: 'Subscription canceled successfully',
            willEndOn: new Date(subscription.current_period_end * 1000)
          }
        });
      } catch (stripeError) {
        console.error('Error canceling Stripe subscription:', stripeError);
        return res.status(400).json({
          status: 'error',
          message: 'Failed to cancel subscription with Stripe'
        });
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to cancel subscription'
      });
    }
  };
  
  cancelUserSubscription();
});

export default router;