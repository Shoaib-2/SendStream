import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import Subscriber from '../../../../utils/lib/models/User';
import User from '../../../../utils/lib/models/User';
import { IUser } from '@/types/user';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

// Ensure MongoDB connection before processing
const connectDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI!, {
    });
  }
};

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Ensure we have an email - this is critical for trial tracking
    const { priceId, successUrl, cancelUrl, email = '' } = body;
    let skipTrial = body.skipTrial ?? false;

    // More thorough logging for debugging
    // console.log('DETAILED CHECKOUT REQUEST:', {
    //   email,
    //   hasEmail: !!email && email.includes('@'),
    //   emailLength: email?.length,
    //   skipTrial,
    //   fullBody: body
    // });

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // This avoids the "User not found by ID lookup" error
    let existingUser = null;
    if (email && email.includes('@')) {
      try {
        existingUser = await User.findOne({ email }).lean() as IUser | null;
        
        if (existingUser) {
          // console.log('User found:', {
          //   _id: existingUser._id,
          //   email: existingUser.email,
          //   trialEndsAt: existingUser.trialEndsAt,
          //   trialUsed: existingUser.trialUsed,
          //   subscriptionStatus: existingUser.subscriptionStatus,
          //   hasStripeSubscription: !!existingUser.stripeSubscriptionId
          // });
        } else {
          console.log('No existing user found with email:', email);
        }
      } catch (error) {
        console.error('Error finding user:', error);
      }
    }

    // console.log('Checkout trial check:', {
    //   email,
    //   emailProvided: !!email,
    //   emailValid: email?.includes('@'),
    //   userExists: !!existingUser,
    //   trialUsed: existingUser?.trialUsed,
    //   skipTrial
    // });

    // IMPROVED: Better detection of used trials
    // This handles cases where:
    // 1. User is explicitly marked as having used trial
    // 2. User had a trial that has expired
    // 3. User has a subscription ID (current or past)
    // 4. User has canceled but still has active access (preserved as valid trial)
    const hasExpiredTrial = existingUser?.trialEndsAt && new Date(existingUser.trialEndsAt) < new Date();
    const hasActiveTrialWithCanceledStatus = existingUser?.trialEndsAt && 
                                           new Date(existingUser.trialEndsAt) > new Date() &&
                                           existingUser.subscriptionStatus === 'canceled';
    
    // If trial is canceled but still active, don't consider it used yet
    const hasUsedTrial = existingUser?.trialUsed || 
                        hasExpiredTrial || 
                        (!!existingUser?.stripeSubscriptionId && !hasActiveTrialWithCanceledStatus);
                        
    // console.log('Enhanced trial eligibility check:', {
    //   email,
    //   trialUsed: existingUser?.trialUsed,
    //   trialEndsAt: existingUser?.trialEndsAt,
    //   hasExpiredTrial,
    //   hasActiveTrialWithCanceledStatus,
    //   hasStripeSubscription: !!existingUser?.stripeSubscriptionId,
    //   subscriptionStatus: existingUser?.subscriptionStatus,
    //   finalHasUsedTrial: hasUsedTrial,
    //   skipTrial
    // });

    // Block free trial for users who have used theirs, unless explicitly skipping trial
    if (email && email.includes('@') && existingUser && hasUsedTrial && !skipTrial) {
      console.log('Blocking checkout - user already used trial:', email);
      return NextResponse.json(
        { error: 'Free trial already used', code: 'TRIAL_USED' }, 
        { status: 403 }
      );
    }

    // Double-check with Stripe for subscription history
    if (email && email.includes('@') && !hasUsedTrial) {
      try {
        // Search for customer by email
        const customers = await stripe.customers.list({
          email: email,
          limit: 1
        });
        
        if (customers.data && customers.data.length > 0) {
          const customerId = customers.data[0].id;
          
          // Check if this customer has any subscriptions
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            limit: 100,
            status: 'all' // Include active, canceled, etc.
          });
          
          // IMPROVED: Better handling of Stripe subscription history
          // Look at subscription history to make decisions
          const hasActiveSubscription = subscriptions.data.some(sub => 
            ['active', 'trialing'].includes(sub.status)
          );
          
          const hasCanceledButActiveSubscription = subscriptions.data.some(sub => 
            sub.status === 'canceled' && sub.cancel_at && new Date(sub.cancel_at * 1000) > new Date()
          );
          
          const hasPastSubscription = subscriptions.data.some(sub => 
            ['canceled', 'unpaid', 'past_due', 'incomplete_expired'].includes(sub.status) && 
            (!sub.cancel_at || new Date(sub.cancel_at * 1000) <= new Date())
          );
          
          if (subscriptions.data.length > 0) {
            // console.log('Found subscription history in Stripe:', {
            //   customerId,
            //   subscriptionCount: subscriptions.data.length,
            //   hasActiveSubscription,
            //   hasCanceledButActiveSubscription,
            //   hasPastSubscription
            // });
            
            // Skip trial for past subscribers, but respect active trials
            if (hasPastSubscription && !hasActiveSubscription && !hasCanceledButActiveSubscription) {
              // console.log('User had past subscriptions, forcing renewal without trial');
              skipTrial = true;
            }
          }
        }
      } catch (stripeError) {
        console.error('Error checking Stripe subscription history:', stripeError);
      }
    }

    // Prepare session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${request.nextUrl.origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/`,
    };

    // If email is provided, add it to session and handle user creation/update
    if (email && email.includes('@')) {
      sessionParams.customer_email = email;
      
      try {
        // IMPROVED: Better update logic for user records
        // Prepare update data with proper flags
        const updateData: Record<string, unknown> = { 
          email,
          subscribed: new Date()
        };
        
        // IMPROVED: Smart trial flag management
        // Don't mark new trials as used immediately
        // Only mark as used if:
        // 1. Existing trial has expired
        // 2. User has past subscription
        if (hasExpiredTrial || hasUsedTrial) {
          // Only mark as used if trial is actually expired or already used
          updateData.trialUsed = true;
        }
        
        // Preserve existing subscription fields
        if (existingUser?.stripeSubscriptionId) {
          updateData.stripeSubscriptionId = existingUser.stripeSubscriptionId;
        }
        if (existingUser?.stripeCustomerId) {
          updateData.stripeCustomerId = existingUser.stripeCustomerId;
        }
        if (existingUser?.subscriptionStatus) {
          updateData.subscriptionStatus = existingUser.subscriptionStatus;
        }
        
        // If user has an active trial that's been canceled, respect that status
        // and don't give them a new trial
        if (hasActiveTrialWithCanceledStatus && !skipTrial) {
          // console.log('User has active but canceled trial, redirecting to existing subscription');
          skipTrial = true;
        }
        
        // console.log('User update data:', updateData);
        
        // IMPROVED: Reliable user update with error handling
        const user = await User.findOneAndUpdate(
          { email },
          updateData,
          { upsert: true, new: true }
        );
        
        if (!user) {
          console.error('Failed to create/update user record');
        } else {
          // console.log('User updated for checkout:', {
          //   email,
          //   userId: user._id,
          //   trialUsed: user.trialUsed,
          //   skipTrial
          // });
          
          // Create or update subscriber if we have a valid user
          try {
            await Subscriber.findOneAndUpdate(
              { email },
              { 
                email, 
                name: email.split('@')[0],
                createdBy: user._id
              },
              { upsert: true, new: true }
            );
          } catch (subError) {
            console.error('Error updating subscriber:', subError);
          }
        }
      } catch (error) {
        console.error('Error creating/updating user/subscriber:', error);
      }
    } else {
      // console.log('No valid email provided for checkout, Stripe will collect it');
    }

    // IMPROVED: Trial period logic based on all the gathered data
    if (!skipTrial) {
      if (hasUsedTrial || hasExpiredTrial) {
        // console.log('User previously used trial, removing trial period');
        // Don't add trial period
      } else {
        // console.log('Adding trial period for eligible user');
        sessionParams.subscription_data = {
          trial_period_days: 14,
        };
      }
    } else {
      // console.log('Trial skipped as requested');
    }

    try {
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create(sessionParams);
      
      return NextResponse.json({ sessionId: session.id });
    } catch (stripeError) {
      console.error('Stripe checkout error:', stripeError);
      return NextResponse.json(
        { error: 'Stripe API error', details: (stripeError as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Server error in checkout route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}