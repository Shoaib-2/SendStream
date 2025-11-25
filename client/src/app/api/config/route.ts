import { NextResponse } from 'next/server';

/**
 * Server-side endpoint to provide client configuration
 * This is a workaround for Vercel not properly exposing NEXT_PUBLIC_* variables
 */
export async function GET() {
  console.log('=== Config Endpoint Server-Side Check ===');
  console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL || 'NOT SET');
  console.log('NEXT_PUBLIC_WS_URL:', process.env.NEXT_PUBLIC_WS_URL || 'NOT SET');
  console.log('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? `SET (${process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.substring(0, 7)}...)` : 'NOT SET');
  console.log('NEXT_PUBLIC_STRIPE_PRICE_ID:', process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'NOT SET');
  console.log('All env keys:', Object.keys(process.env).filter(k => k.startsWith('NEXT_PUBLIC_')));
  console.log('========================================');

  // These are read server-side where env vars are available
  const config = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://backend-9h3q.onrender.com/api',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'wss://backend-9h3q.onrender.com/ws',
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_51QyeEHGfclTFWug1IEyUj4jhpKMvsw7g5XV84MMO24hzIHF3M31ydHK3PgorqCOVCgRRBA6CKkULwTqG2dnyBDpu00hpQrKVNl',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1QzeqbGfclTFWug124uFjz1g',
  };

  console.log('Returning config:', {
    apiUrl: config.apiUrl,
    wsUrl: config.wsUrl,
    hasStripeKey: !!config.stripePublishableKey,
    stripeKeyPrefix: config.stripePublishableKey.substring(0, 7),
    stripePriceId: config.stripePriceId,
  });

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}
