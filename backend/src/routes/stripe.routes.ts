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
          
          // First try to find by stripeCustomerId
          let updatedSubUser = await User.findOneAndUpdate(
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

          // If not found, try to get customer email from Stripe and update by email
          if (!updatedSubUser) {
            try {
              const customer = await stripe.customers.retrieve(customerId2);
              if (customer && !customer.deleted && 'email' in customer && customer.email) {
                logger.info(`User not found by customerId, trying email: ${customer.email}`);
                updatedSubUser = await User.findOneAndUpdate(
                  { email: customer.email },
                  {
                    stripeCustomerId: customerId2,
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
              }
            } catch (customerError) {
              logger.error('Error fetching customer for subscription update:', customerError);
            }
          }

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
            
            // First try to find by stripeCustomerId
            let renewedUser = await User.findOneAndUpdate(
              { stripeCustomerId: paidCustomerId },
              {
                subscriptionStatus: 'active',
                hasActiveAccess: true,
                stripeSubscriptionId: paidSubscriptionId,
                updatedAt: new Date()
              },
              { new: true }
            );
            
            // If not found, try to get customer email from Stripe and update by email
            if (!renewedUser) {
              try {
                const customer = await stripe.customers.retrieve(paidCustomerId);
                if (customer && !customer.deleted && 'email' in customer && customer.email) {
                  logger.info(`User not found by customerId for payment, trying email: ${customer.email}`);
                  renewedUser = await User.findOneAndUpdate(
                    { email: customer.email },
                    {
                      stripeCustomerId: paidCustomerId,
                      subscriptionStatus: 'active',
                      hasActiveAccess: true,
                      stripeSubscriptionId: paidSubscriptionId,
                      updatedAt: new Date()
                    },
                    { new: true }
                  );
                }
              } catch (customerError) {
                logger.error('Error fetching customer for payment success:', customerError);
              }
            }
            
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

    // IMPORTANT: Reuse existing Stripe customer if one exists to maintain subscription history
    if (existingUser?.stripeCustomerId) {
      logger.info(`Reusing existing Stripe customer ${existingUser.stripeCustomerId} for ${email}`);
      sessionParams.customer = existingUser.stripeCustomerId;
    } else if (email && email.includes('@')) {
      // Check if customer exists in Stripe by email
      try {
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
          logger.info(`Found existing Stripe customer ${customers.data[0].id} by email ${email}`);
          sessionParams.customer = customers.data[0].id;
          // Update user with the found customer ID
          await User.findOneAndUpdate({ email }, { stripeCustomerId: customers.data[0].id });
        } else {
          sessionParams.customer_email = email;
        }
      } catch (customerLookupError) {
        logger.error('Error looking up customer by email:', customerLookupError);
        sessionParams.customer_email = email;
      }
    }

    if (email && email.includes('@')) {
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

/**
 * POST /api/stripe/sync-subscription
 * Sync subscription from Stripe to database using email
 * This is useful when webhooks fail or database gets out of sync
 */
const syncSubscription: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ status: 'error', message: 'Email is required' });
      return;
    }
    
    // Find all customers with this email in Stripe
    const customers = await stripe.customers.list({ email, limit: 10 });
    
    if (!customers.data.length) {
      res.status(404).json({ status: 'error', message: 'No Stripe customer found with this email' });
      return;
    }
    
    // Check all customers for active subscriptions
    let activeSubscription: Stripe.Subscription | null = null;
    let activeCustomerId: string | null = null;
    
    for (const customer of customers.data) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10
      });
      
      const validSub = subscriptions.data.find(
        sub => sub.status === 'active' || sub.status === 'trialing'
      );
      
      if (validSub) {
        activeSubscription = validSub;
        activeCustomerId = customer.id;
        break;
      }
    }
    
    if (!activeSubscription || !activeCustomerId) {
      res.status(404).json({ 
        status: 'error', 
        message: 'No active subscription found for this email',
        customers: customers.data.map(c => c.id)
      });
      return;
    }
    
    // Update user in database
    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        stripeCustomerId: activeCustomerId,
        stripeSubscriptionId: activeSubscription.id,
        subscriptionStatus: activeSubscription.status,
        hasActiveAccess: true,
        trialEndsAt: activeSubscription.trial_end 
          ? new Date(activeSubscription.trial_end * 1000) 
          : undefined,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedUser) {
      res.status(404).json({ status: 'error', message: 'User not found in database' });
      return;
    }
    
    logger.info('Subscription synced successfully:', {
      email: updatedUser.email,
      stripeCustomerId: activeCustomerId,
      stripeSubscriptionId: activeSubscription.id,
      subscriptionStatus: activeSubscription.status
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Subscription synced successfully',
      data: {
        stripeCustomerId: activeCustomerId,
        stripeSubscriptionId: activeSubscription.id,
        subscriptionStatus: activeSubscription.status,
        hasActiveAccess: true
      }
    });
  } catch (error) {
    logger.error('Error syncing subscription:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to sync subscription',
      error: (error as Error).message 
    });
  }
};

router.post('/sync-subscription', express.json(), syncSubscription);

export default router;
