// Custom error classes for different error types

export class ValidationError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: Record<string, string>;

  constructor(message: string, errors?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.isOperational = true;
    this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthorizationError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends Error {
  statusCode: number;
  isOperational: boolean;
  resource?: string;

  constructor(message: string, resource?: string) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.isOperational = true;
    this.resource = resource;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ConflictError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class RateLimitError extends Error {
  statusCode: number;
  isOperational: boolean;
  retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.statusCode = 429;
    this.isOperational = true;
    this.retryAfter = retryAfter;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ExternalServiceError extends Error {
  statusCode: number;
  isOperational: boolean;
  service?: string;

  constructor(message: string, service?: string) {
    super(message);
    this.name = 'ExternalServiceError';
    this.statusCode = 502;
    this.isOperational = true;
    this.service = service;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DatabaseError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.isOperational = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InternalServerError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string = 'Internal server error') {
    super(message);
    this.name = 'InternalServerError';
    this.statusCode = 500;
    this.isOperational = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Type guard to check if error is operational
export function isOperationalError(error: Error): boolean {
  if ('isOperational' in error) {
    return (error as any).isOperational === true;
  }
  return false;
}

// Helper to format error response
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: unknown;
  };
}

export function formatErrorResponse(error: Error): ErrorResponse {
  const statusCode = (error as any).statusCode || 500;
  const details: Record<string, unknown> = {};

  // Add additional details based on error type
  if (error instanceof ValidationError && error.errors) {
    details.validationErrors = error.errors;
  }
  
  if (error instanceof NotFoundError && error.resource) {
    details.resource = error.resource;
  }
  
  if (error instanceof RateLimitError && error.retryAfter) {
    details.retryAfter = error.retryAfter;
  }
  
  if (error instanceof ExternalServiceError && error.service) {
    details.service = error.service;
  }

  return {
    success: false,
    error: {
      message: error.message,
      code: error.name,
      statusCode,
      ...(Object.keys(details).length > 0 && { details })
    }
  };
}
