"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helmetConfig = void 0;
/**
 * Helmet Security Configuration
 * Sets various HTTP headers to protect against common web vulnerabilities
 */
exports.helmetConfig = {
    // Content Security Policy - prevents XSS attacks
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'", "ws://localhost:*", "wss://localhost:*", "https://api.stripe.com"],
            frameSrc: ["'self'", "https://js.stripe.com"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    // HTTP Strict Transport Security - forces HTTPS
    hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
    },
    // X-Frame-Options - prevents clickjacking
    frameguard: {
        action: 'deny', // Don't allow site to be embedded in iframes
    },
    // X-Content-Type-Options - prevents MIME sniffing
    noSniff: true,
    // X-XSS-Protection - enables browser's XSS filter
    xssFilter: true,
    // Referrer-Policy - controls referrer information
    referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
    },
    // X-DNS-Prefetch-Control - controls DNS prefetching
    dnsPrefetchControl: {
        allow: false,
    },
    // X-Download-Options - prevents IE from executing downloads
    ieNoOpen: true,
    // X-Permitted-Cross-Domain-Policies - controls Adobe products' cross-domain policies
    permittedCrossDomainPolicies: {
        permittedPolicies: 'none',
    },
    // Hide X-Powered-By header
    hidePoweredBy: true,
};
