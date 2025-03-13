import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { connectToDatabase } from '../../../../utils/lib/mongodb'; // Adjust import path as needed
import dotenv from 'dotenv';

dotenv.config();
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

    const { client, db } = await connectToDatabase();

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object as Stripe.Subscription;
          
          await db.collection('users').updateOne(
            { stripeCustomerId: subscription.customer as string },
            {
              $set: {
                subscriptionStatus: subscription.status,
                stripeSubscriptionId: subscription.id,
                trialEndsAt: subscription.trial_end 
                  ? new Date(subscription.trial_end * 1000) 
                  : null
              }
            }
          );
          break;
        
        case 'customer.subscription.deleted':
          const deletedSubscription = event.data.object as Stripe.Subscription;
          
          await db.collection('users').updateOne(
            { stripeCustomerId: deletedSubscription.customer as string },
            {
              $set: {
                subscriptionStatus: 'canceled',
                stripeSubscriptionId: null
              }
            }
          );
          break;
      }
    } finally {
      await client.close();
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}