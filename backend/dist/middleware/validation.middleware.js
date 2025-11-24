"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
exports.sanitizeString = sanitizeString;
exports.sanitizeEmail = sanitizeEmail;
exports.sanitizeHTML = sanitizeHTML;
exports.sanitizeObject = sanitizeObject;
const zod_1 = require("zod");
const customErrors_1 = require("../utils/customErrors");
const validate = (schema) => {
    return async (req, _res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params
            });
            return next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = {};
                error.issues.forEach((issue) => {
                    const path = issue.path.join('.');
                    errors[path] = issue.message;
                });
                return next(new customErrors_1.ValidationError('Validation failed', errors));
            }
            return next(error);
        }
    };
};
exports.validate = validate;
// Sanitization helpers
function sanitizeString(input) {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove HTML brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}
function sanitizeEmail(email) {
    return email.toLowerCase().trim();
}
function sanitizeHTML(html) {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/on\w+\s*=/gi, '');
}
function sanitizeObject(obj) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        }
        else if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeObject(value);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
