import { NextResponse } from 'next/server';

/**
 * Server-side endpoint to provide client configuration
 * This is a workaround for Vercel not properly exposing NEXT_PUBLIC_* variables
 */
export async function GET() {
  // These are read server-side where env vars are available
  const config = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://backend-9h3q.onrender.com/api',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'wss://backend-9h3q.onrender.com/ws',
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1QzeqbGfclTFWug124uFjz1g',
  };

  console.log('Config endpoint called, returning:', {
    apiUrl: config.apiUrl,
    wsUrl: config.wsUrl,
    hasStripeKey: !!config.stripePublishableKey,
    stripePriceId: config.stripePriceId,
  });

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
