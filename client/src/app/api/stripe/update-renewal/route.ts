// pages/api/stripe/update-renewal.ts
import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

// Define types for request and response data
interface UpdateRenewalRequest {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}

interface UpdateRenewalResponse {
  status: 'success' | 'error';
  message?: string;
  subscription?: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
  };
}

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
    const body = await request.json() as UpdateRenewalRequest;
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
      const backendUrl = process.env.NEXT_PUBLIC_API_URL;
      const response = await axios.post<UpdateRenewalResponse>(
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
    } catch (apiError) {
      const error = apiError as AxiosError<UpdateRenewalResponse>;
      console.error('Backend API error:', error.response?.data || error.message);
      
      // Forward the error status and message from backend
      const status = error.response?.status || 500;
      const errorData = error.response?.data || { 
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