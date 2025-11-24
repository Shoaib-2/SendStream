"use strict";
// Custom error classes for different error types
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalServerError = exports.DatabaseError = exports.ExternalServiceError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = void 0;
exports.isOperationalError = isOperationalError;
exports.formatErrorResponse = formatErrorResponse;
class ValidationError extends Error {
    constructor(message, errors) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = 400;
        this.isOperational = true;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends Error {
    constructor(message = 'Authentication failed') {
        super(message);
        this.name = 'AuthenticationError';
        this.statusCode = 401;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends Error {
    constructor(message = 'Insufficient permissions') {
        super(message);
        this.name = 'AuthorizationError';
        this.statusCode = 403;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends Error {
    constructor(message, resource) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
        this.isOperational = true;
        this.resource = resource;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConflictError';
        this.statusCode = 409;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends Error {
    constructor(message = 'Too many requests', retryAfter) {
        super(message);
        this.name = 'RateLimitError';
        this.statusCode = 429;
        this.isOperational = true;
        this.retryAfter = retryAfter;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.RateLimitError = RateLimitError;
class ExternalServiceError extends Error {
    constructor(message, service) {
        super(message);
        this.name = 'ExternalServiceError';
        this.statusCode = 502;
        this.isOperational = true;
        this.service = service;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ExternalServiceError = ExternalServiceError;
class DatabaseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DatabaseError';
        this.statusCode = 500;
        this.isOperational = false;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.DatabaseError = DatabaseError;
class InternalServerError extends Error {
    constructor(message = 'Internal server error') {
        super(message);
        this.name = 'InternalServerError';
        this.statusCode = 500;
        this.isOperational = false;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.InternalServerError = InternalServerError;
// Type guard to check if error is operational
function isOperationalError(error) {
    if ('isOperational' in error) {
        return error.isOperational === true;
    }
    return false;
}
function formatErrorResponse(error) {
    const statusCode = error.statusCode || 500;
    const details = {};
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
