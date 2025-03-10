import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

/**
 * Middleware to check if a user has an active subscription
 * Redirects to payment page if subscription has expired or doesn't exist
 */
export const requireActiveSubscription = async (
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  try {
    // Skip if no authenticated user
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    // Get user with subscription details
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user has any subscription
    if (!user.stripeSubscriptionId) {
      return res.status(403).json({
        status: 'error',
        message: 'Subscription required',
        code: 'SUBSCRIPTION_REQUIRED'
      });
    }

    // If subscription exists, verify its status from Stripe
    try {
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      // Allow access for active, trialing, or past_due subscriptions
      const activeStatuses = ['active', 'trialing', 'past_due'];
      
      if (!activeStatuses.includes(subscription.status)) {
        // Check if canceled but still in paid period
        if (subscription.status === 'canceled' && 
            subscription.current_period_end * 1000 > Date.now()) {
          // Still within paid period despite cancellation
          return next();
        }
        
        return res.status(403).json({
          status: 'error',
          message: 'Subscription expired',
          code: 'SUBSCRIPTION_EXPIRED'
        });
      }
      
      // Update user subscription status in database if needed
      if (user.subscriptionStatus === 'canceled' || 
        (user.trialEndsAt && new Date(user.trialEndsAt) < new Date())) {
      return res.status(403).json({
        status: 'error',
        message: 'Subscription expired',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }
      
      // If all checks pass, continue
      return next();
    } catch (stripeError) {
      console.error('Error verifying subscription with Stripe:', stripeError);
      
      // Fall back to database status if Stripe API fails
      if (user.subscriptionStatus === 'active' || 
          user.subscriptionStatus === 'trialing') {
        return next();
      }
      
      // If subscription status in database isn't active, require renewal
      return res.status(403).json({
        status: 'error',
        message: 'Subscription validation failed',
        code: 'SUBSCRIPTION_VALIDATION_FAILED'
      });
    }
  } catch (error) {
    console.error('Subscription middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};