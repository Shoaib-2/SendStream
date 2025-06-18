import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '../../../../utils/lib/models/User';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia',
});

// Ensure MongoDB connection before processing
const connectDB = async () => {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI!, {});
  }
};

export async function POST(request: NextRequest) {
  try {
    // Check for admin token/auth
    // This should be a protected endpoint
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    
    // Find all users
    const users = await User.find({});
    // console.log(`Found ${users.length} users to check`);
    
    const results = {
      total: users.length,
      updated: 0,
      withStripeSubscription: 0,
      withTrialEndsAt: 0,
      errors: 0
    };
    
    // Process each user
    for (const user of users) {
      try {
        const updateData: Record<string, unknown> = {};
        let needsUpdate = false;
        
        // Check if user has trial end date but trialUsed is not set
        if (user.trialEndsAt && !user.trialUsed) {
          updateData.trialUsed = true;
          needsUpdate = true;
          results.withTrialEndsAt++;
        }
        
        // Check if user has subscription ID but trialUsed is not set
        if (user.stripeSubscriptionId && !user.trialUsed) {
          updateData.trialUsed = true;
          needsUpdate = true;
          results.withStripeSubscription++;
        }
        
        // If no local flags, check Stripe directly
        if (!needsUpdate && user.email) {
          try {
            // Check for customer in Stripe
            const customers = await stripe.customers.list({
              email: user.email,
              limit: 1
            });
            
            if (customers.data.length > 0) {
              const customerId = customers.data[0].id;
              
              // Check for subscriptions
              const subscriptions = await stripe.subscriptions.list({
                customer: customerId,
                limit: 100,
                status: 'all'
              });
              
              if (subscriptions.data.length > 0) {
                updateData.trialUsed = true;
                updateData.stripeCustomerId = updateData.stripeCustomerId || customerId;
                
                // Store first subscription ID if none exists
                if (!user.stripeSubscriptionId && subscriptions.data[0].id) {
                  updateData.stripeSubscriptionId = subscriptions.data[0].id;
                }
                
                needsUpdate = true;
                // console.log(`Found Stripe history for ${user.email}`);
              }
            }
          } catch (stripeError) {
            console.error(`Stripe error for user ${user.email}:`, stripeError);
          }
        }
        
        // Update user if needed
        if (needsUpdate) {
          await User.findByIdAndUpdate(user._id, updateData);
          results.updated++;
        }
      } catch (userError) {
        console.error(`Error processing user ${user.email}:`, userError);
        results.errors++;
      }
    }
    
    return NextResponse.json({
      status: 'success',
      results
    });
  } catch (error) {
    console.error('Error fixing trial records:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to fix trial records',
      error: (error as Error).message
    }, { status: 500 });
  }
}