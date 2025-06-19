import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';

// Define types for the response data
interface SubscriptionStatusResponse {
  status: string;
  subscription?: {
    id: string;
    status: string;
    currentPeriodEnd?: string;
  };
  message?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Forward the request to your backend API
    try {      
      const response = await axios.get<SubscriptionStatusResponse>(
        `${process.env.NEXT_PUBLIC_API_URL}/subscription/status`, 
        {
          headers: {
            'Authorization': authHeader
          }
        }
      );
      
      return NextResponse.json(response.data);
    } catch (apiError) {
      const error = apiError as AxiosError<SubscriptionStatusResponse>;
      console.error('Backend API error:', error.response?.data || error.message);
      
      // Forward the error status and message from backend
      const status = error.response?.status || 500;
      const errorData = error.response?.data || { 
        error: 'Failed to connect to backend API' 
      };
      
      return NextResponse.json(errorData, { status });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}