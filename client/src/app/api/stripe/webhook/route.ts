import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
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
          const session = event.data.object as Stripe.Checkout.Session;
          const email = session.customer_email;
          const customerId = session.customer as string;
 
          if (email) {
            await Subscriber.findOneAndUpdate(
              { email },
              { 
                stripeCustomerId: customerId,
                stripeCheckoutSessionId: session.id,
                subscriptionStatus: 'active', // Add this line
                status: 'active' // Ensure status is active
              },
              { new: true }
            );
          }
          break;
 
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object as Stripe.Subscription;
          
          await Subscriber.findOneAndUpdate(
            { stripeCustomerId: subscription.customer as string },
            {
              subscriptionStatus: subscription.status,
              status: 'active',
              stripeSubscriptionId: subscription.id,
              subscribed: new Date().toISOString(),
              trialEndsAt: subscription.trial_end 
                ? new Date(subscription.trial_end * 1000) 
                : undefined
            }
          );
          break;
        
        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          
          await Subscriber.findOneAndUpdate(
            { stripeCustomerId: deletedSubscription.customer as string },
            {
              subscriptionStatus: 'canceled',
              status: 'unsubscribed',
              stripeSubscriptionId: undefined,
              trialEndsAt: undefined
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