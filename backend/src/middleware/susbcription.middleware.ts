// backend/src/middleware/subscription/subscription.middleware.ts
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export const checkSubscription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip check for auth routes and webhooks
    if (
      req.path.includes('/auth/') ||
      req.path.includes('/webhook') ||
      req.path.includes('/public') ||
      req.method === 'OPTIONS'
    ) {
      return next();
    }

    // Get user from request (set by auth middleware)
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Always check Stripe for the latest subscription status
    try {
      if (user.stripeSubscriptionId) {
        // Get the latest subscription status from Stripe
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        
        // Update user's subscription status in the database
        const currentStatus = user.subscriptionStatus;
        const stripeStatus = subscription.status;
        
        if (currentStatus !== stripeStatus) {
          console.log(`Updating subscription status from ${currentStatus} to ${stripeStatus}`);
          user.subscriptionStatus = stripeStatus;
          await User.findByIdAndUpdate(user._id, { 
            subscriptionStatus: stripeStatus,
            updatedAt: new Date()
          });
        }
        
        // Check if subscription is active or trialing
        if (stripeStatus === 'active' || stripeStatus === 'trialing') {
          return next();
        }
        
        // Check if subscription is past_due or incomplete but still usable
        if (['past_due', 'incomplete'].includes(stripeStatus)) {
          console.log(`User ${user.email} has subscription in ${stripeStatus} state`);
          return next();
        }
        
        // For canceled subscriptions, check if still in paid period
        if (stripeStatus === 'canceled') {
          const currentTime = Math.floor(Date.now() / 1000);
          if (subscription.current_period_end > currentTime) {
            // console.log(`User ${user.email} has canceled subscription but still in paid period`);
            // Update database to reflect access is still valid
            await User.findByIdAndUpdate(user._id, { 
              hasActiveAccess: true,
              updatedAt: new Date()
            });
            return next();
          }
        }
      }
      
      // Also check if user recently renewed
      // This handles the case where they have a new subscription that hasn't been linked yet
      try {
        if (user.stripeCustomerId) {
          const customerSubscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            status: 'active',
            limit: 1
          });
          
          if (customerSubscriptions.data.length > 0) {
            const latestSubscription = customerSubscriptions.data[0];
            
            // If there's a newer subscription than what we have saved
            if (latestSubscription.id !== user.stripeSubscriptionId) {
              console.log(`User ${user.email} has a new subscription ${latestSubscription.id}`);
              
              // Update user with new subscription details
              await User.findByIdAndUpdate(user._id, {
                stripeSubscriptionId: latestSubscription.id,
                subscriptionStatus: latestSubscription.status,
                hasActiveAccess: true,
                updatedAt: new Date()
              });
              
              return next();
            }
          }
        }
      } catch (listError) {
        console.error('Error checking for newer subscriptions:', listError);
      }
      
      // Also check trial end date
      if (user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) {
        console.log(`User ${user.email} has an active trial until ${user.trialEndsAt}`);
        return next();
      }
      
      // If we get here, subscription is not active
      return res.status(403).json({
        status: 'error',
        message: 'Subscription expired',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    } catch (stripeError) {
      console.error('Error checking subscription with Stripe:', stripeError);
      
      // If Stripe error, fall back to database status
      if (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing') {
        return next();
      }
      
      // If user has active access flag set
      if (user.hasActiveAccess) {
        return next();
      }
      
      // If trial is still active by our database
      if (user.trialEndsAt && new Date(user.trialEndsAt) > new Date()) {
        return next();
      }
      
      return res.status(403).json({
        status: 'error',
        message: 'Subscription expired',
        code: 'SUBSCRIPTION_EXPIRED'
      });
    }
  } catch (error) {
    console.error('Subscription middleware error:', error);
    next(error);
  }
};