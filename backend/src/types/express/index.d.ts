import 'express';

// Extend Express types for custom user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        role: string;
      }
    }
  }
}