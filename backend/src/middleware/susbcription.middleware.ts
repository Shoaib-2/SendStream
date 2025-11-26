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
      
      // Also check if user recently renewed or has a newer subscription
      // This handles the case where they have a new subscription that hasn't been linked yet
      try {
        if (user.stripeCustomerId) {
          // Check for any valid subscription (active or trialing)
          const customerSubscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            limit: 10  // Get more to find any valid subscription
          });
          
          // Find the most recent active or trialing subscription
          const validSubscription = customerSubscriptions.data.find(
            sub => sub.status === 'active' || sub.status === 'trialing'
          );
          
          if (validSubscription) {
            // If this is a different subscription than what we have saved, or if our saved status is wrong
            if (validSubscription.id !== user.stripeSubscriptionId || 
                user.subscriptionStatus !== validSubscription.status ||
                !user.hasActiveAccess) {
              console.log(`User ${user.email} has a valid subscription ${validSubscription.id} (${validSubscription.status})`);
              
              // Update user with correct subscription details
              await User.findByIdAndUpdate(user._id, {
                stripeSubscriptionId: validSubscription.id,
                subscriptionStatus: validSubscription.status,
                hasActiveAccess: true,
                updatedAt: new Date()
              });
              
              return next();
            }
            
            // Subscription matches what we have and is valid
            return next();
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
    } catch (stripeError: any) {
      console.error('Error checking subscription with Stripe:', stripeError);
      
      // If subscription not found in Stripe, check for newer subscriptions via customer ID
      if (stripeError.type === 'StripeInvalidRequestError' && 
          stripeError.code === 'resource_missing' && 
          user.stripeCustomerId) {
        console.log(`Subscription ${user.stripeSubscriptionId} not found, checking for newer subscriptions`);
        
        try {
          // Check for any valid subscription via customer ID
          const customerSubscriptions = await stripe.subscriptions.list({
            customer: user.stripeCustomerId,
            limit: 10
          });
          
          // Find an active or trialing subscription
          const validSubscription = customerSubscriptions.data.find(
            sub => sub.status === 'active' || sub.status === 'trialing'
          );
          
          if (validSubscription) {
            console.log(`Found valid subscription ${validSubscription.id} for user ${user.email} after Stripe error`);
            
            // Update user with correct subscription details
            await User.findByIdAndUpdate(user._id, {
              stripeSubscriptionId: validSubscription.id,
              subscriptionStatus: validSubscription.status,
              hasActiveAccess: true,
              updatedAt: new Date()
            });
            
            return next();
          }
        } catch (lookupError) {
          console.error('Error checking for newer subscriptions after Stripe error:', lookupError);
        }
      }
      
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