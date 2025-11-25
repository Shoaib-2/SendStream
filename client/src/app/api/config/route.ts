import { NextResponse } from 'next/server';

/**
 * Server-side endpoint to provide client configuration
 * Environment variables are automatically available in Next.js (NEXT_PUBLIC_* prefix)
 * This endpoint is no longer needed but kept for backward compatibility
 */
export async function GET() {
  const config = {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://backend-9h3q.onrender.com/api',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'wss://backend-9h3q.onrender.com/ws',
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1QzeqbGfclTFWug124uFjz1g',
  };

  return NextResponse.json(config, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
