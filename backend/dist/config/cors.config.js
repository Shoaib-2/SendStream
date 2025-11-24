"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allowedOrigins = exports.corsConfig = void 0;
/**
 * CORS Configuration
 * Controls which origins can access the API
 */
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://client-3ye4.onrender.com',
    'https://backend-9h3q.onrender.com'
];
exports.allowedOrigins = allowedOrigins;
exports.corsConfig = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-XSRF-TOKEN'],
    exposedHeaders: ['Set-Cookie', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
    maxAge: 86400, // 24 hours - how long browser can cache preflight results
    preflightContinue: false,
    optionsSuccessStatus: 204
};
