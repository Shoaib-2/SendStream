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
          const subscriptionId = session.subscription as string;

          logger.info('Checkout session completed:', {
            email,
            customerId,
            subscriptionId,
            sessionId: session.id
          });

          if (email) {
            const updateData: Record<string, unknown> = {
              stripeCustomerId: customerId,
              stripeCheckoutSessionId: session.id,
              subscriptionStatus: 'active',
              hasActiveAccess: true,
              updatedAt: new Date()
            };

            // Add subscription ID if present
            if (subscriptionId) {
              updateData.stripeSubscriptionId = subscriptionId;
            }

            const updatedUser = await User.findOneAndUpdate(
              { email },
              updateData,
              { new: true }
            );

            logger.info('User updated after checkout:', {
              email: updatedUser?.email,
              stripeSubscriptionId: updatedUser?.stripeSubscriptionId,
              subscriptionStatus: updatedUser?.subscriptionStatus,
              hasActiveAccess: updatedUser?.hasActiveAccess
            });
          }
          break;

        case 'customer.subscription.updated':
          const subscription = event.data.object as Stripe.Subscription;
          const customerId2 = subscription.customer as string;
          const trialEnd = subscription.trial_end 
            ? new Date(subscription.trial_end * 1000) 
            : undefined;
          
          // Use actual Stripe status - don't override based on cancel_at_period_end
          // The subscription is still active until the period actually ends
          const subscriptionStatus = subscription.status;
          const hasActiveAccess = ['active', 'trialing'].includes(subscription.status);

          logger.info('Subscription updated:', {
            subscriptionId: subscription.id,
            customerId: customerId2,
            status: subscriptionStatus,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            hasActiveAccess,
            trialEnd
          });
          
          const updatedSubUser = await User.findOneAndUpdate(
            { stripeCustomerId: customerId2 },
            {
              subscriptionStatus: subscriptionStatus,
              hasActiveAccess: hasActiveAccess,
              stripeSubscriptionId: subscription.id,
              subscribed: new Date().toISOString(),
              cancelAtPeriodEndPreference: subscription.cancel_at_period_end,
              ...(trialEnd && { trialEndsAt: trialEnd }),
              updatedAt: new Date()
            },
            { new: true }
          );

          logger.info('User updated after subscription update:', {
            email: updatedSubUser?.email,
            stripeSubscriptionId: updatedSubUser?.stripeSubscriptionId,
            subscriptionStatus: updatedSubUser?.subscriptionStatus,
            hasActiveAccess: updatedSubUser?.hasActiveAccess
          });
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
          const failedInvoice = event.data.object as Stripe.Invoice;
          const failedCustomerId = failedInvoice.customer as string;
          
          await User.findOneAndUpdate(
            { stripeCustomerId: failedCustomerId },
            { 
              subscriptionStatus: 'past_due',
              hasActiveAccess: false,
              updatedAt: new Date()
            }
          );
          logger.warn('Payment failed for customer:', failedCustomerId);
          break;

        case 'invoice.payment_succeeded':
          const paidInvoice = event.data.object as Stripe.Invoice;
          const paidCustomerId = paidInvoice.customer as string;
          const paidSubscriptionId = paidInvoice.subscription as string;
          
          // Only process if this is a subscription-related invoice
          if (paidSubscriptionId) {
            logger.info('Payment succeeded for subscription renewal:', {
              customerId: paidCustomerId,
              subscriptionId: paidSubscriptionId,
              amountPaid: paidInvoice.amount_paid
            });
            
            const renewedUser = await User.findOneAndUpdate(
              { stripeCustomerId: paidCustomerId },
              {
                subscriptionStatus: 'active',
                hasActiveAccess: true,
                stripeSubscriptionId: paidSubscriptionId,
                updatedAt: new Date()
              },
              { new: true }
            );
            
            logger.info('User subscription renewed:', {
              email: renewedUser?.email,
              stripeSubscriptionId: renewedUser?.stripeSubscriptionId,
              subscriptionStatus: renewedUser?.subscriptionStatus
            });
          }
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
