import { Request, Response, NextFunction } from 'express';
import { APIError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Only log errors in non-test environment
  if (process.env.NODE_ENV !== 'test') {
    console.error('Error:', err);
  }

  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      data: err.data
    });
  }
  // Log the full error in production
  console.error('Detailed error:', {
    message: err.message,
    stack: err.stack,
    name: err.name
  });

  // Default error response
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
