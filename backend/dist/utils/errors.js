"use strict";
// backend/src/utils/errors.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationError = exports.APIError = void 0;
class APIError extends Error {
    constructor(statusCode, message, data) {
        super(message);
        this.statusCode = statusCode;
        this.data = data;
        this.name = 'APIError';
        Error.captureStackTrace?.(this, this.constructor);
    }
}
exports.APIError = APIError;
class IntegrationError extends Error {
    constructor(service, code, message) {
        super(message);
        this.service = service;
        this.code = code;
        this.name = 'IntegrationError';
    }
}
exports.IntegrationError = IntegrationError;
