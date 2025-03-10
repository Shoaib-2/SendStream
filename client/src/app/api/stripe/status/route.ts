import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Forward the request to your backend API
    try {
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const response = await axios.get(`${backendUrl}/subscription/status`, {
        headers: {
          'Authorization': authHeader
        }
      });
      
      return NextResponse.json(response.data);
    } catch (apiError: any) {
      console.error('Backend API error:', apiError.response?.data || apiError.message);
      
      // Forward the error status and message from backend
      const status = apiError.response?.status || 500;
      const errorData = apiError.response?.data || { 
        error: 'Failed to connect to backend API' 
      };
      
      return NextResponse.json(errorData, { status });
    }
  } catch (error) {
    console.error('Error in API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}