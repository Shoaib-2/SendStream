// pages/api/stripe/update-renewal.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Parse the request body
    const body = await request.json();
    const { subscriptionId, cancelAtPeriodEnd } = body;
    
    if (!subscriptionId) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Subscription ID is required' 
      }, { status: 400 });
    }
    
    if (typeof cancelAtPeriodEnd !== 'boolean') {
      return NextResponse.json({ 
        status: 'error', 
        message: 'cancelAtPeriodEnd must be a boolean value' 
      }, { status: 400 });
    }
    
    // Forward the request to your backend API
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await axios.post(
        `${backendUrl}/subscription/update-renewal`, 
        { subscriptionId, cancelAtPeriodEnd },
        {
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return NextResponse.json(response.data);
    } catch (apiError: any) {
      console.error('Backend API error:', apiError.response?.data || apiError.message);
      
      // Forward the error status and message from backend
      const status = apiError.response?.status || 500;
      const errorData = apiError.response?.data || { 
        status: 'error',
        message: 'Failed to update subscription renewal settings' 
      };
      
      return NextResponse.json(errorData, { status });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}