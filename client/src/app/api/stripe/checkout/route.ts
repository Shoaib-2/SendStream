import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import Subscriber from '../../../../utils/lib/models/User';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

// Ensure MongoDB connection before processing
const connectDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI!, {
      // Add your connection options here
    });
  }
};

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { priceId, successUrl, cancelUrl, skipTrial = false, email = '' } = body;

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // Prepare session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${request.nextUrl.origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/`,
    };

    // If email is provided, add it and try to find/create subscriber
    if (email) {
      sessionParams.customer_email = email;
      
      // Find or create subscriber (only if email is provided)
      try {
        let subscriber = await Subscriber.findOne({ email });
        
        if (!subscriber) {
          subscriber = new Subscriber({
            email,
            status: 'active',
            subscribed: new Date().toISOString(),
            name: email.split('@')[0]
          });
          await subscriber.save();
        }
      } catch (dbError) {
        console.warn('Non-critical DB error when creating subscriber:', dbError);
        // Continue with Stripe checkout even if subscriber creation fails
      }
    }

    // Add trial period if not skipped
    if (!skipTrial) {
      sessionParams.subscription_data = {
        trial_period_days: 14,
      };
    }

    try {
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create(sessionParams);
      
      // If email was provided, try to update subscriber with session ID
      if (email) {
        try {
          await Subscriber.updateOne(
            { email },
            { stripeCheckoutSessionId: session.id }
          );
        } catch (updateError) {
          console.warn('Non-critical DB error when updating subscriber:', updateError);
          // Continue even if updating fails
        }
      }

      return NextResponse.json({ sessionId: session.id });
    } catch (stripeError) {
      console.error('Stripe checkout error:', stripeError);
      return NextResponse.json(
        { error: 'Stripe API error', details: (stripeError as Error).message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Server error in checkout route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}