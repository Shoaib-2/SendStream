import Stripe from 'stripe';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia', // Use the latest API version
});

// Create a checkout session for subscription with trial
export const createCheckoutSession = async (
  priceId: string, 
  successUrl: string = '', 
  cancelUrl: string = ''
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

// Cancel a subscription (can be used for canceling trial)
export const cancelSubscription = async (subscriptionId: string) => {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
};

// Get all subscriptions for a customer
export const getCustomerSubscriptions = async (customerId: string) => {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    expand: ['data.default_payment_method'],
  });
  
  return subscriptions.data;
};

// Create a new customer
export const createCustomer = async (email: string, name: string) => {
  return await stripe.customers.create({
    email,
    name,
  });
};

// Add payment method to customer
export const attachPaymentMethod = async (customerId: string, paymentMethodId: string) => {
  return await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });
};

// Handle webhook events
export const handleWebhookEvent = async (payload: any, signature: string) => {
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  // Handle specific events
  switch (event.type) {
    case 'customer.subscription.created':
      // A customer subscribed to your product
      const subscription = event.data.object as Stripe.Subscription;
      // Update your database with subscription status
      // e.g., await updateUserSubscription(subscription.customer, subscription.id, subscription.status);
      break;
    
    case 'customer.subscription.updated':
      // Subscription was updated
      const updatedSubscription = event.data.object as Stripe.Subscription;
      // Update subscription status in your database
      break;
    
    case 'customer.subscription.deleted':
      // Subscription was canceled or expired
      const deletedSubscription = event.data.object as Stripe.Subscription;
      // Mark subscription as inactive in your database
      break;
      
    case 'invoice.payment_succeeded':
      // Payment for subscription succeeded
      const invoice = event.data.object as Stripe.Invoice;
      // Update payment status in your database
      break;
      
    case 'invoice.payment_failed':
      // Payment for subscription failed
      const failedInvoice = event.data.object as Stripe.Invoice;
      // Notify customer about failed payment
      break;
  }
  
  return event;
};

export default {
  createCheckoutSession,
  cancelSubscription,
  getCustomerSubscriptions,
  createCustomer,
  attachPaymentMethod,
  handleWebhookEvent
};