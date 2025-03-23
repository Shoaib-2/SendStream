import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import User from '../../../../utils/lib/models/User';
import Subscriber from '../../../../utils/lib/models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature');
    
    if (!signature) {
      return NextResponse.json({ error: 'Stripe signature is required' }, { status: 400 });
    }
    
    const body = await request.text();
    
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
 
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          // Handle successful checkout completion
          const session = event.data.object as Stripe.Checkout.Session;
          const email = session.customer_email;
          const customerId = session.customer as string;
 
          if (email) {
            // Update both User and Subscriber models to ensure consistency
            // Note: In a proper setup, you might want separate User and Subscriber models
            await User.findOneAndUpdate(
              { email },
              { 
                stripeCustomerId: customerId,
                stripeCheckoutSessionId: session.id,
                subscriptionStatus: 'active', 
                status: 'active', // Ensure status is active
                // Don't set trialUsed here - will be determined by subscription event
              },
              { new: true }
            );
            
            // Also update subscriber record if using separate collection
            await Subscriber.findOneAndUpdate(
              { email },
              { 
                stripeCustomerId: customerId,
                stripeCheckoutSessionId: session.id,
                status: 'active' // Ensure status is active
              },
              { new: true }
            );
          }
          break;
 
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          // Handle subscription updates
          const subscription = event.data.object as Stripe.Subscription;
          const customerId2 = subscription.customer as string;
          
          // Determine if this is a trial
          const isTrialing = subscription.status === 'trialing';
          const trialEnd = subscription.trial_end 
            ? new Date(subscription.trial_end * 1000) 
            : undefined;
          
          // Check if canceled but still active
          const isCanceled = subscription.cancel_at_period_end;
          const canceled = isCanceled ? 'canceled' : subscription.status;
          
          console.log('Subscription event:', {
            event: event.type,
            status: subscription.status,
            isCanceled,
            isTrialing,
            trialEnd
          });
          
          // Update user record
          await User.findOneAndUpdate(
            { stripeCustomerId: customerId2 },
            {
              subscriptionStatus: canceled,
              status: 'active',
              stripeSubscriptionId: subscription.id,
              subscribed: new Date().toISOString(),
              // Important: Only set trialEndsAt if there's an active trial
              ...(trialEnd && { trialEndsAt: trialEnd }),
              // Don't set trialUsed=true yet if user is in active trial
              updatedAt: new Date() // Force update timestamp
            }
          );
          
          break;
        
        case 'customer.subscription.deleted':
          // Handle subscription cancellation or expiration
          const deletedSubscription = event.data.object as Stripe.Subscription;
          const customerId3 = deletedSubscription.customer as string;
          
          // Only find by stripeCustomerId to ensure we update the right user
          const user = await User.findOne({ stripeCustomerId: customerId3 });
          
          if (user) {
            console.log('Processing subscription deletion for user:', {
              email: user.email,
              previousStatus: user.subscriptionStatus,
              hadTrial: !!user.trialEndsAt,
              trialUsed: user.trialUsed
            });
            
            // Update logic - CRITICAL: Keep track of trial usage
            // We mark trialUsed=true for any terminated subscription
            // This prevents the same user from getting multiple trials
            await User.findByIdAndUpdate(
              user._id,
              {
                subscriptionStatus: 'canceled',
                // Don't change status to unsubscribed - that's different than subscription status
                // status: 'active',
                // IMPORTANT: Mark trial as used instead of clearing the date
                // This ensures users can't get multiple trials
                trialUsed: true,
                // Keep the trialEndsAt for reference, but mark it as used
                updatedAt: new Date()
              }
            );
            
            // Update subscriber if needed
            await Subscriber.findOneAndUpdate(
              { email: user.email },
              { 
                status: 'active' // Keep subscriber active even if subscription canceled
              }
            );
          } else {
            console.log('No user found for deleted subscription:', customerId3);
          }
          break;
          
        case 'invoice.payment_failed':
          // Handle failed payment - could mark subscription as past_due
          const invoice = event.data.object as Stripe.Invoice;
          const customerId4 = invoice.customer as string;
          
          await User.findOneAndUpdate(
            { stripeCustomerId: customerId4 },
            { 
              subscriptionStatus: 'past_due',
              // We don't mark trial as used yet, as they might fix payment
            }
          );
          break;
      }
    } catch (processError) {
      console.error('Webhook processing error:', processError);
    }
 
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}