"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = void 0;
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const customErrors_1 = require("../utils/customErrors");
const errorHandler = (err, _req, res, _next) => {
    // Log error with appropriate level
    if ((0, customErrors_1.isOperationalError)(err)) {
        logger_1.logger.warn('Operational error:', {
            name: err.name,
            message: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
    else {
        logger_1.logger.error('Non-operational error:', {
            name: err.name,
            message: err.message,
            stack: err.stack
        });
    }
    // Handle custom error types
    if (err instanceof customErrors_1.ValidationError ||
        err instanceof customErrors_1.AuthenticationError ||
        err instanceof customErrors_1.AuthorizationError ||
        err instanceof customErrors_1.NotFoundError ||
        err instanceof customErrors_1.ConflictError ||
        err instanceof customErrors_1.RateLimitError ||
        err instanceof customErrors_1.ExternalServiceError ||
        err instanceof customErrors_1.DatabaseError ||
        err instanceof customErrors_1.InternalServerError) {
        const errorResponse = (0, customErrors_1.formatErrorResponse)(err);
        return res.status(errorResponse.error.statusCode).json(errorResponse);
    }
    // Handle legacy APIError
    if (err instanceof errors_1.APIError) {
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
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
