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
    
    // First check with backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const backendResponse = await fetch(
      `${apiUrl}/auth/check-trial-eligibility?email=${encodeURIComponent(email)}&includeSubscription=true&includeTrialData=true`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    
    const backendData = backendResponse.ok 
      ? await backendResponse.json() 
      : { status: 'error', eligibleForTrial: true };
    
    // Also check directly with Stripe
    let stripeData = { 
      hasCustomer: false, 
      hasSubscriptions: false,
      subscriptionCount: 0
    };
    
    try {
      // Check for customer by email
      const customers = await stripe.customers.list({
        email: email,
        limit: 1
      });
      
      if (customers.data && customers.data.length > 0) {
        const customerId = customers.data[0].id;
        stripeData.hasCustomer = true;
        
        // Check for subscriptions
        const subscriptions = await stripe.subscriptions.list({
          customer: customerId,
          limit: 100,
          status: 'all' // Include active, canceled, etc.
        });
        
        stripeData.hasSubscriptions = subscriptions.data.length > 0;
        stripeData.subscriptionCount = subscriptions.data.length;
      }
    } catch (stripeError) {
      console.error('Error checking Stripe:', stripeError);
    }
    
    // Determine eligibility based on both sources
    // User is NOT eligible for a trial if:
    // 1. They have an active trial currently
    // 2. They have a past subscription
    // 3. They're marked with trialUsed=true in database
    const hasActiveTrial = backendData.status === 'success' && 
                          backendData?.userData?.trialEndsAt && 
                          new Date(backendData.userData.trialEndsAt) > new Date();
                          
    const hasPastSubscription = stripeData.hasSubscriptions;
    const isMarkedTrialUsed = backendData.status === 'success' && 
                             backendData?.userData?.trialUsed === true;
    
    // Eligible if none of the exclusion criteria apply
    const eligibleForTrial = !hasActiveTrial && !hasPastSubscription && !isMarkedTrialUsed;
    
    // Determine reason for ineligibility
    let reason = null;
    if (!eligibleForTrial) {
      if (hasActiveTrial) {
        reason = 'User has an active trial';
      } else if (hasPastSubscription) {
        reason = 'User has previous subscription history';
      } else if (isMarkedTrialUsed) {
        reason = 'User has already used their trial';
      }
    }
    
    return NextResponse.json({
      status: 'success',
      eligibleForTrial,
      hasActiveTrial,
      hasPastSubscription,
      isMarkedTrialUsed,
      backendCheck: backendData,
      stripeCheck: stripeData,
      reason,
      trialData: backendData?.userData?.trialEndsAt ? {
        trialEndsAt: backendData.userData.trialEndsAt,
        trialRemaining: Math.max(0, Math.floor((new Date(backendData.userData.trialEndsAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
        isActive: new Date(backendData.userData.trialEndsAt) > new Date()
      } : null
    });
  } catch (error) {
    console.error('Error in check-trial-eligibility API route:', error);
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