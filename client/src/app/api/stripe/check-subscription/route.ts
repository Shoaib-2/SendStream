import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

export async function GET(request: NextRequest) {
  try {
    // Get email from query parameter
    const email = request.nextUrl.searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { status: 'error', message: 'Email is required' },
        { status: 400 }
      );
    }
    
    try {
      // Search for customer by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      
      if (customers.data && customers.data.length > 0) {
        const customerId = customers.data[0].id;
        
        // Check if this customer has any subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 100,
          status: 'all' // Include active, canceled, etc.
        });
        
        // Return subscription data
        return NextResponse.json({
          status: 'success',
          hasCustomer: true,
          customerId: customerId,
          hasSubscriptions: subscriptions.data.length > 0,
          subscriptionCount: subscriptions.data.length,
          subscriptionIds: subscriptions.data.map(sub => sub.id),
          statuses: subscriptions.data.map(sub => sub.status)
        });
      } else {
        // No customer found
        return NextResponse.json({
          status: 'success',
          hasCustomer: false,
          hasSubscriptions: false
        });
      }
    } catch (stripeError) {
      console.error('Error checking Stripe subscription history:', stripeError);
      return NextResponse.json({
        status: 'error',
        message: 'Failed to check Stripe subscription history',
        error: (stripeError as Error).message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in check-subscription API route:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Internal server error',
        error: (error as Error).message 
      },
      { status: 500 }
    );
  }
}