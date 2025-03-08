import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia', // Use the latest API version
});

// Special config for Stripe webhooks to get raw body
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
    
    // Get the raw request body for Stripe
    const body = await request.text();
    
    // Verify the event came from Stripe
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    // Handle specific events
    switch (event.type) {
      case 'customer.subscription.created':
        // A customer subscribed to your product
        const subscription = event.data.object as Stripe.Subscription;
        // Update your database with subscription status
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

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 });
  }
}