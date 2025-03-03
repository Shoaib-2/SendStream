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

  // Default error response
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
