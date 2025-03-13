import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe directly here
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia', // Use the latest API version
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceId, successUrl, cancelUrl } = body;

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    // Add detailed logging
    console.log('Creating checkout session with:', { 
      priceId, 
      successUrl: successUrl || 'not provided', 
      cancelUrl: cancelUrl || 'not provided' 
    });

    // Check if Stripe is properly initialized
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not defined');
      return NextResponse.json({ error: 'Stripe configuration error' }, { status: 500 });
    }

    try {
      // Create checkout session with simplified parameters
      const session = await stripe.checkout.sessions.create({
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
        success_url: successUrl || `${request.nextUrl.origin}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl || `${request.nextUrl.origin}/`,
      });

      console.log('Session created successfully:', session.id);
      return NextResponse.json({ sessionId: session.id });
    } catch (stripeError) {
      console.error('Stripe error:', stripeError);
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