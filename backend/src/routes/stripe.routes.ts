import express, { Request, Response, RequestHandler } from 'express';
import Stripe from 'stripe';
import User, { IUser } from '../models/User';
import { logger } from '../utils/logger';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

/**
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 */
const handleWebhook: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['stripe-signature'];
    
    if (!signature) {
      res.status(400).json({ error: 'Stripe signature is required' });
      return;
    }
    
    const body = req.body;
    
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session;
          const email = session.customer_email;
          const customerId = session.customer as string;

          if (email) {
            await User.findOneAndUpdate(
              { email },
              { 
                stripeCustomerId: customerId,
                stripeCheckoutSessionId: session.id,
                subscriptionStatus: 'active',
                status: 'active',
              },
              { new: true }
            );
          }
          break;

        case 'customer.subscription.updated':
          const subscription = event.data.object as Stripe.Subscription;
          const customerId2 = subscription.customer as string;
          const trialEnd = subscription.trial_end 
            ? new Date(subscription.trial_end * 1000) 
            : undefined;
          
          const isCanceled = subscription.cancel_at_period_end;
          const canceled = isCanceled ? 'canceled' : subscription.status;
          
          await User.findOneAndUpdate(
            { stripeCustomerId: customerId2 },
            {
              subscriptionStatus: canceled,
              status: 'active',
              stripeSubscriptionId: subscription.id,
              subscribed: new Date().toISOString(),
              ...(trialEnd && { trialEndsAt: trialEnd }),
              updatedAt: new Date()
            }
          );
          break;
        
        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          const customerId3 = deletedSubscription.customer as string;
          
          const user = await User.findOne({ stripeCustomerId: customerId3 });
          
          if (user) {
            await User.findByIdAndUpdate(
              user._id,
              {
                subscriptionStatus: 'canceled',
                trialUsed: true,
                updatedAt: new Date()
              }
            );
          }
          break;
          
        case 'invoice.payment_failed':
          const invoice = event.data.object as Stripe.Invoice;
          const customerId4 = invoice.customer as string;
          
          await User.findOneAndUpdate(
            { stripeCustomerId: customerId4 },
            { subscriptionStatus: 'past_due' }
          );
          break;
      }
    } catch (processError) {
      logger.error('Webhook processing error:', processError);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
};

/**
 * POST /api/stripe/checkout
 * Create Stripe checkout session
 */
const createCheckout: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { priceId, successUrl, cancelUrl, email = '', skipTrial = false } = req.body;

    if (!priceId) {
      res.status(400).json({ error: 'Price ID is required' });
      return;
    }

    let existingUser = null;
    if (email && email.includes('@')) {
      existingUser = await User.findOne({ email }).lean() as IUser | null;
    }

    const hasExpiredTrial = existingUser?.trialEndsAt && new Date(existingUser.trialEndsAt) < new Date();
    const hasActiveTrialWithCanceledStatus = existingUser?.trialEndsAt && 
                                           new Date(existingUser.trialEndsAt) > new Date() &&
                                           existingUser.subscriptionStatus === 'canceled';
    
    const hasUsedTrial = existingUser?.trialUsed || 
                        hasExpiredTrial || 
                        (!!existingUser?.stripeSubscriptionId && !hasActiveTrialWithCanceledStatus);

    if (email && email.includes('@') && existingUser && hasUsedTrial && !skipTrial) {
      res.status(403).json({ error: 'Free trial already used', code: 'TRIAL_USED' });
      return;
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${process.env.CLIENT_URL}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.CLIENT_URL}/`,
    };

    if (email && email.includes('@')) {
      sessionParams.customer_email = email;
      
      const updateData: Record<string, unknown> = { 
        email,
        subscribed: new Date()
      };
      
      if (hasExpiredTrial || hasUsedTrial) {
        updateData.trialUsed = true;
      }
      
      await User.findOneAndUpdate(
        { email },
        updateData,
        { upsert: true, new: true }
      );
    }

    if (!skipTrial && !hasUsedTrial && !hasExpiredTrial) {
      sessionParams.subscription_data = {
        trial_period_days: 14,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    
    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    logger.error('Server error in checkout route:', error);
    res.status(500).json({ error: 'Internal server error', details: (error as Error).message });
  }
};

/**
 * GET /api/stripe/check-subscription
 * Check if email has existing subscription
 */
const checkSubscription: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const email = req.query.email as string;
    
    if (!email) {
      res.status(400).json({ status: 'error', message: 'Email is required' });
      return;
    }
    
    try {
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      
      if (customers.data && customers.data.length > 0) {
        const customerId = customers.data[0].id;
        
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 100,
          status: 'all'
        });
        
        res.status(200).json({
          status: 'success',
          hasCustomer: true,
          customerId: customerId,
          hasSubscriptions: subscriptions.data.length > 0,
          subscriptionCount: subscriptions.data.length,
          subscriptionIds: subscriptions.data.map(sub => sub.id),
          statuses: subscriptions.data.map(sub => sub.status)
        });
        return;
      } else {
        res.status(200).json({
          status: 'success',
          hasCustomer: false,
          hasSubscriptions: false
        });
        return;
      }
    } catch (stripeError) {
      logger.error('Error checking Stripe subscription history:', stripeError);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check Stripe subscription history',
        error: (stripeError as Error).message
      });
    }
  } catch (error) {
    logger.error('Error in check-subscription API route:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error',
      error: (error as Error).message 
    });
  }
};

// Route definitions
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);
router.post('/checkout', express.json(), createCheckout); // Add JSON parsing for checkout
router.get('/check-subscription', checkSubscription);

export default router;
