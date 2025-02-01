// backend/src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { APIError } from '../utils/errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Log the error for debugging
  console.error('Error:', err);

  // Default error response
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
};

