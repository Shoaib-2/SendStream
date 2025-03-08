import { Request, Response } from 'express';
import stripeService from '../services/Integrations/stripe';

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    const session = await stripeService.createCheckoutSession(priceId, successUrl, cancelUrl);
    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required' });
    }

    const subscription = await stripeService.cancelSubscription(subscriptionId);
    res.status(200).json({ subscription });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

export const getSubscriptionStatus = async (req: Request, res: Response) => {
  try {
    // Get customer ID from authenticated user session
    const customerId = req.user?.stripeCustomerId;
    
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required' });
    }
    
    const subscriptions = await stripeService.getCustomerSubscriptions(customerId);
    res.status(200).json({ subscriptions });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    return res.status(400).json({ error: 'Stripe signature is required' });
  }

  try {
    await stripeService.handleWebhookEvent(req.body, signature);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
};

export default {
  createCheckoutSession,
  cancelSubscription,
  getSubscriptionStatus,
  handleWebhook
};