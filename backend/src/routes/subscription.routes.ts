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
  console.error('STRIPE_SECRET_KEY not found in environment variables!');
}

// Initialize Stripe with a fallback empty string if key is missing
const stripe = new Stripe(stripeApiKey || 'dummy_key_for_initialization', {
  apiVersion: '2025-02-24.acacia',
});

// Apply auth middleware to all routes
router.use(protect as RequestHandler);

// Get subscription status
router.get('/status', async function(req, res) {
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
});

// Cancel subscription
router.post('/cancel', async function(req, res) {
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
});

export default router;