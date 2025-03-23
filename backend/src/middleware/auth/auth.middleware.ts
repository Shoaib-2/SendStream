// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { APIError } from '../../utils/errors';
import User from '../../models/User';

interface JwtPayload {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}


export const protect = async (req: Request, res: Response, next: NextFunction) => {
  console.log('Trial Eligibility Middleware Debug:', {
    path: req.path,
    headers: req.headers,
    cookies: req.cookies
  });

  // Explicit routes bypass
  const publicRoutes = [
    '/auth/login', 
    '/auth/register', 
    '/auth/check-trial-eligibility'
  ];

  if (publicRoutes.includes(req.path)) {
    return next();
  }
  try {
    // Skip auth check for login and register routes
    if (req.path === '/auth/login' || req.path === '/auth/register' ||  req.path === '/auth/check-trial-eligibility') {
      return next();
    }
    
    // Get token from HTTP-only cookie instead of header
    const token = req.cookies?.jwt;
    
    // Fallback to header for backwards compatibility during transition
    const authHeader = req.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
    
    // Use cookie token or fallback to header token
    const authToken = token || headerToken;
    
    if (!authToken) {
      // Return 401 error response directly instead of throwing
      return res.status(401).json({
        status: 'error',
        message: 'Please log in to access this resource'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET || 'fallback-secret-for-dev') as JwtPayload;

      // Check if user still exists
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'User no longer exists'
        });
      }

      // Grant access
      req.user = user;
      next();
    } catch (jwtError) {
      // Handle invalid token errors
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token. Please log in again.'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Authentication error'
    });
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    next();
  };
};