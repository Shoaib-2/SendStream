// backend/src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { APIError } from '../../utils/errors';
import  User  from '../../models/User';

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
  try {
    // Get token from HTTP-only cookie instead of header
    const token = req.cookies.jwt;
    
    // Fallback to header for backwards compatibility during transition
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    
    // Use cookie token or fallback to header token
    const authToken = token || headerToken;
    
    if (!authToken) {
      throw new APIError(401, 'Please log in to access this resource');
    }

    // Verify token
    const decoded = jwt.verify(authToken, process.env.JWT_SECRET!) as JwtPayload;

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new APIError(401, 'User no longer exists');
    }

    // Grant access
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      throw new APIError(403, 'You do not have permission to perform this action');
    }
    next();
  };
};