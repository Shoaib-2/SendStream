import Stripe from 'stripe';
import dotenv from 'dotenv';
import User from '../../models/User';

dotenv.config();

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Create a checkout session for subscription with trial
export const createCheckoutSession = async (
  priceId: string, 
  successUrl: string, 
  cancelUrl: string
) => {
  return await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 14,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    automatic_tax: { enabled: true },
  });
};

export const getCustomerSubscriptions = async (customerId: string) => {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    expand: ['data.default_payment_method'],
  });
  
  return subscriptions.data;
};

// Cancel a subscription (can be used for canceling trial)
export const cancelSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
};

// Handle webhook events
export const handleWebhookEvent = async (payload: unknown, signature: string) => {
  const event = stripe.webhooks.constructEvent(
    payload as string | Buffer,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object as Stripe.Subscription;
        
        const user = await User.findOne({ 
          stripeCustomerId: subscription.customer as string 
        });

        if (user) {
          const statusMapping: Record<string, 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null> = {
            'active': 'active',
            'trialing': 'trialing',
            'past_due': 'past_due',
            'canceled': 'canceled',
            'unpaid': 'unpaid',
            'incomplete': null
          };

          user.subscriptionStatus = statusMapping[subscription.status] || null;
          user.stripeSubscriptionId = subscription.id;
          user.trialEndsAt = subscription.trial_end 
            ? new Date(subscription.trial_end * 1000) 
            : undefined;

          await user.save();
        }
        break;
      
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        
        await User.findOneAndUpdate(
          { stripeCustomerId: deletedSubscription.customer as string },
          { 
            subscriptionStatus: 'canceled',
            stripeSubscriptionId: undefined,
            trialEndsAt: undefined 
          }
        );
        break;
    }
  } catch (error) {
    console.error('Webhook event processing error:', error);
  }

  return event;
};

export default {
  createCheckoutSession,
  cancelSubscription,
  getCustomerSubscriptions,
  handleWebhookEvent
};