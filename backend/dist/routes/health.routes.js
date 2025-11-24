"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const stripe_1 = __importDefault(require("stripe"));
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
// Helper to handle async route handlers
const asyncHandler = (fn) => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};
/**
 * Enhanced health check endpoint
 * Checks database, Stripe, and Mailchimp connectivity
 */
router.get('/', asyncHandler(async (_req, res) => {
    const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
            server: 'ok',
            database: 'checking',
            stripe: 'checking'
        }
    };
    try {
        // Check database connection
        if (mongoose_1.default.connection.readyState === 1) {
            healthStatus.checks.database = 'ok';
        }
        else {
            healthStatus.checks.database = 'disconnected';
            healthStatus.status = 'degraded';
        }
        // Check Stripe connection
        try {
            if (process.env.STRIPE_SECRET_KEY) {
                const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
                await stripe.customers.list({ limit: 1 });
                healthStatus.checks.stripe = 'ok';
            }
            else {
                healthStatus.checks.stripe = 'not_configured';
            }
        }
        catch (stripeError) {
            logger_1.logger.error('Stripe health check failed:', stripeError);
            healthStatus.checks.stripe = 'error';
            healthStatus.status = 'degraded';
        }
        // Check Mailchimp (optional - only if configured globally)
        if (process.env.MAILCHIMP_API_KEY) {
            try {
                const response = await fetch(`https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/ping`, {
                    headers: {
                        Authorization: `Bearer ${process.env.MAILCHIMP_API_KEY}`
                    }
                });
                if (response.ok) {
                    healthStatus.checks.mailchimp = 'ok';
                }
                else {
                    healthStatus.checks.mailchimp = 'error';
                    healthStatus.status = 'degraded';
                }
            }
            catch (mailchimpError) {
                logger_1.logger.error('Mailchimp health check failed:', mailchimpError);
                healthStatus.checks.mailchimp = 'error';
                healthStatus.status = 'degraded';
            }
        }
        else {
            healthStatus.checks.mailchimp = 'not_configured';
        }
        const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
        return res.status(statusCode).json(healthStatus);
    }
    catch (error) {
        logger_1.logger.error('Health check error:', error);
        return res.status(503).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
            checks: healthStatus.checks
        });
    }
}));
exports.default = router;
