import Stripe from 'stripe';
import dotenv from 'dotenv';
import User, { IUser } from '../../models/User';
import { logger } from '../../utils/logger';

dotenv.config();

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

/**
 * Create a checkout session for subscription with trial
 */
export const createCheckoutSession = async (
  priceId: string, 
  successUrl: string, 
  cancelUrl: string,
  options: {
    email?: string;
    skipTrial?: boolean;
  } = {}
) => {
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    automatic_tax: { enabled: true },
  };

  // Add trial if not skipped
  if (!options.skipTrial) {
    sessionConfig.subscription_data = {
      trial_period_days: 14,
    };
  }

  // Add email if provided
  if (options.email) {
    sessionConfig.customer_email = options.email;
  }

  return await stripe.checkout.sessions.create(sessionConfig);
};

/**
 * Retrieve a checkout session by ID
 */
export const retrieveCheckoutSession = async (sessionId: string) => {
  return await stripe.checkout.sessions.retrieve(sessionId);
};

/**
 * Get customer subscriptions
 */
export const getCustomerSubscriptions = async (customerId: string) => {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    expand: ['data.default_payment_method'],
  });
  
  return subscriptions.data;
};

/**
 * Retrieve a specific subscription
 */
export const retrieveSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.retrieve(subscriptionId);
};

/**
 * Cancel a subscription at period end
 */
export const cancelSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
};

/**
 * Reactivate a canceled subscription
 */
export const reactivateSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
};

/**
 * Update subscription renewal settings
 */
export const updateSubscriptionRenewal = async (
  subscriptionId: string,
  cancelAtPeriodEnd: boolean
) => {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });
};

/**
 * Handle webhook events
 */
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
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object as Stripe.Customer);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }
  } catch (error) {
    logger.error('Webhook event processing error:', error);
    throw error;
  }

  return event;
};

/**
 * Handle subscription creation/update
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const user = await User.findOne({ 
    stripeCustomerId: subscription.customer as string 
  });

  if (!user) {
    logger.warn(`User not found for Stripe customer: ${subscription.customer}`);
    return;
  }

  const statusMapping: Record<string, IUser['subscriptionStatus']> = {
    'active': 'active',
    'trialing': 'trialing',
    'past_due': 'past_due',
    'canceled': 'canceled',
    'unpaid': 'unpaid',
    'incomplete': null,
    'incomplete_expired': null,
  };

  user.subscriptionStatus = statusMapping[subscription.status] || null;
  user.stripeSubscriptionId = subscription.id;
  user.trialEndsAt = subscription.trial_end 
    ? new Date(subscription.trial_end * 1000) 
    : undefined;
  user.hasActiveAccess = ['active', 'trialing'].includes(subscription.status);

  await user.save();
  
  logger.info(`Subscription updated for user ${user.email}: ${subscription.status}`);
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await User.findOne({ 
    stripeCustomerId: subscription.customer as string 
  });

  if (!user) {
    logger.warn(`User not found for deleted subscription: ${subscription.customer}`);
    return;
  }

  user.subscriptionStatus = 'canceled';
  user.stripeSubscriptionId = undefined;
  user.trialEndsAt = undefined;
  user.hasActiveAccess = false;

  await user.save();
  
  logger.info(`Subscription deleted for user ${user.email}`);
}

/**
 * Handle trial ending soon (3 days before)
 */
async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  const user = await User.findOne({ 
    stripeCustomerId: subscription.customer as string 
  });

  if (!user) {
    logger.warn(`User not found for trial ending: ${subscription.customer}`);
    return;
  }

  logger.info(`Trial will end soon for user ${user.email}`);
  
  // TODO: Send reminder email about trial ending
  // This can be integrated with your email service
  // await emailService.sendTrialEndingReminder(user.email, user.trialEndsAt);
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const user = await User.findOne({ 
    stripeCustomerId: invoice.customer as string 
  });

  if (!user) {
    logger.warn(`User not found for payment success: ${invoice.customer}`);
    return;
  }

  // Ensure user has active access after successful payment
  if (user.subscriptionStatus !== 'active') {
    user.subscriptionStatus = 'active';
    user.hasActiveAccess = true;
    await user.save();
  }

  logger.info(`Payment succeeded for user ${user.email}: $${(invoice.amount_paid / 100).toFixed(2)}`);
  
  // TODO: Send payment receipt email
  // await emailService.sendPaymentReceipt(user.email, invoice);
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const user = await User.findOne({ 
    stripeCustomerId: invoice.customer as string 
  });

  if (!user) {
    logger.warn(`User not found for payment failure: ${invoice.customer}`);
    return;
  }

  // Update subscription status to past_due
  user.subscriptionStatus = 'past_due';
  user.hasActiveAccess = false;
  await user.save();

  logger.warn(`Payment failed for user ${user.email}`);
  
  // TODO: Send payment failure notification
  // await emailService.sendPaymentFailedNotification(user.email, invoice);
}

/**
 * Handle customer deletion
 */
async function handleCustomerDeleted(customer: Stripe.Customer) {
  const user = await User.findOne({ 
    stripeCustomerId: customer.id 
  });

  if (!user) {
    logger.warn(`User not found for deleted customer: ${customer.id}`);
    return;
  }

  // Clean up Stripe data
  user.stripeCustomerId = undefined;
  user.stripeSubscriptionId = undefined;
  user.subscriptionStatus = null;
  user.trialEndsAt = undefined;
  user.hasActiveAccess = false;

  await user.save();
  
  logger.info(`Customer deleted, cleared Stripe data for user ${user.email}`);
}

export default {
  createCheckoutSession,
  retrieveCheckoutSession,
  cancelSubscription,
  reactivateSubscription,
  updateSubscriptionRenewal,
  getCustomerSubscriptions,
  retrieveSubscription,
  handleWebhookEvent
};
