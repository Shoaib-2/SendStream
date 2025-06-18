import { NextRequest, NextResponse } from 'next/server';
import User from '../../../../utils/lib/models/User';
import Stripe from 'stripe';
import { connectMongoose } from '@/utils/lib/mongodb';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

export async function POST(request: NextRequest) {
  try {
    // Use the standardized connection
    await connectMongoose();

    const body = await request.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'User not found' 
      }, { status: 404 });
    }
    
    // console.log('Found user to refresh trial status:', {
    //   email,
    //   userId: user._id,
    //   currentTrialUsed: user.trialUsed,
    //   stripeSubscriptionId: user.stripeSubscriptionId ? '[REDACTED]' : undefined,
    //   hasStripeSubscriptionId: !!user.stripeSubscriptionId,
    //   stripeCustomerId: user.stripeCustomerId ? '[REDACTED]' : undefined
    // });
    
    // Check Stripe for subscription history
    let stripeHasSubscription = false;
    
    try {
      if (user.stripeCustomerId) {
        // Use existing customer ID if available
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          limit: 100,
          status: 'all'
        });
        
        stripeHasSubscription = subscriptions.data.length > 0;
      } else {
        // Otherwise search by email
        const customers = await stripe.customers.list({
          email: email,
          limit: 1
        });
        
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id;
          
          const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            limit: 100,
            status: 'all'
          });
          
          stripeHasSubscription = subscriptions.data.length > 0;
        }
      }
    } catch (stripeError) {
      console.error('Error checking Stripe:', stripeError);
    }
    
    // Update user trial status based on subscriptions and trial end date
    const updateData: Record<string, unknown> = {};
    
    // Set trialUsed based on multiple factors
    updateData.trialUsed = user.trialUsed || 
                          stripeHasSubscription || 
                          (user.trialEndsAt && new Date(user.trialEndsAt) < new Date());
    
    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      updateData,
      { new: true }
    );
    
    return NextResponse.json({
      status: 'success',
      message: 'Trial status refreshed',
      previousTrialUsed: user.trialUsed,
      newTrialUsed: updatedUser.trialUsed,
      hadSubscriptionInStripe: stripeHasSubscription
    });
  } catch (error) {
    console.error('Error refreshing trial status:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to refresh trial status',
      error: (error as Error).message
    }, { status: 500 });
  }
}