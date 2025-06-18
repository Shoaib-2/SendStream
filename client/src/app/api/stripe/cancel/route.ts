import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the request body
    const body = await request.json();
    
    // Forward the request to your backend API
    try {      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/subscription/cancel`, body, {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      
      return NextResponse.json(response.data);
    } catch (apiError: unknown) {
      console.error('Backend API error:', (apiError as any).response?.data || (apiError as any).message);
      
      // Forward the error status and message from backend
      const status = (apiError as any).response?.status || 500;
      const errorData = (apiError as any).response?.data || { 
        error: 'Failed to connect to backend API' 
      };
      
      return NextResponse.json(errorData, { status });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}