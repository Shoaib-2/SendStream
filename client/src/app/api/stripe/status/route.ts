import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia', // Use the latest API version
});

export async function GET(request: NextRequest) {
  try {
    // For this implementation, we'll get customerId from query or cookies
    // In a real app, you'd use your auth system to get the user
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // In a real app, you'd validate the token and get the user
    // This is just a placeholder - replace with your actual auth logic
    const customerId = request.cookies.get('stripe_customer_id')?.value;
    
    if (!customerId) {
      return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
    }
    
    // Get all active subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all',
      expand: ['data.default_payment_method'],
    });
    
    return NextResponse.json({ subscriptions: subscriptions.data });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json({ error: 'Failed to fetch subscription status' }, { status: 500 });
  }
}