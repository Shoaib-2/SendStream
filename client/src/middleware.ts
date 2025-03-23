/**
 * @file middleware.ts
 * @description Handles route protection, API security and authentication verification
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes
const protectedRoutes = ['/dashboard', '/settings', '/newsletters', '/subscribers', '/settings'];
const authRoutes = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthenticated = request.cookies.has('auth_token') || request.headers.get('authorization');

  // API protection - only allow from same domain to prevent CSRF
  if (pathname.startsWith('/api/')) {
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');
    
    // Whitelist for webhooks and public API endpoints
    const publicApiEndpoints = [
      '/api/stripe/webhook',
      '/api/auth/check-trial-eligibility'
    ];
    
    const isPublicEndpoint = publicApiEndpoints.some(endpoint => 
      pathname.startsWith(endpoint)
    );
    
    // Allow webhook calls and public endpoints
    if (isPublicEndpoint) {
      return NextResponse.next();
    }
    
    // For all other API requests, check referer
    if (!referer || (host && !referer.includes(host))) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized API access' }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protect dashboard routes
  if (!isAuthenticated && protectedRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/newsletters/:path*',
    '/login/:path*',
    '/signup/:path*',
    '/api/:path*',
  ],
};