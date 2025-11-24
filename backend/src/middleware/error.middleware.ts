import { Request, Response, NextFunction } from 'express';
import { APIError } from '../utils/errors';
import { logger } from '../utils/logger';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  DatabaseError,
  InternalServerError,
  isOperationalError,
  formatErrorResponse
} from '../utils/customErrors';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Log error with appropriate level
  if (isOperationalError(err)) {
    logger.warn('Operational error:', {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } else {
    logger.error('Non-operational error:', {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
  }

  // Handle custom error types
  if (err instanceof ValidationError ||
      err instanceof AuthenticationError ||
      err instanceof AuthorizationError ||
      err instanceof NotFoundError ||
      err instanceof ConflictError ||
      err instanceof RateLimitError ||
      err instanceof ExternalServiceError ||
      err instanceof DatabaseError ||
      err instanceof InternalServerError) {
    const errorResponse = formatErrorResponse(err);
    return res.status(errorResponse.error.statusCode).json(errorResponse);
  }

  // Handle legacy APIError
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: 'APIError',
        statusCode: err.statusCode,
        details: err.data
      }
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'ValidationError',
        statusCode: 400,
        details: err.message
      }
    });
  }

  // Handle Mongoose CastError
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid ID format',
        code: 'CastError',
        statusCode: 400
      }
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
        code: 'JsonWebTokenError',
        statusCode: 401
      }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expired',
        code: 'TokenExpiredError',
        statusCode: 401
      }
    });
  }

  // Default error response
  return res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      code: 'InternalServerError',
      statusCode: 500,
      ...(process.env.NODE_ENV === 'development' && { details: err.stack })
    }
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
