"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
class ConfigService {
    constructor() {
        this.requiredEnvVars = [
            'MONGODB_URI',
            'JWT_SECRET',
            'EMAIL_USER',
            'EMAIL_HOST',
            'EMAIL_PORT',
            'EMAIL_PASSWORD',
            'STRIPE_SECRET_KEY',
            'STRIPE_WEBHOOK_SECRET',
            'CLIENT_URL'
        ];
        this.validateEnvironment();
        this.config = this.loadConfig();
    }
    validateEnvironment() {
        const missing = [];
        for (const envVar of this.requiredEnvVars) {
            if (!process.env[envVar]) {
                missing.push(envVar);
            }
        }
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables:\n${missing.join('\n')}\n\n` +
                'Please check your .env file and ensure all required variables are set.');
        }
    }
    loadConfig() {
        return {
            nodeEnv: process.env.NODE_ENV || 'development',
            port: parseInt(process.env.PORT || '5000', 10),
            mongodbUri: process.env.MONGODB_URI,
            jwtSecret: process.env.JWT_SECRET,
            jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
            emailUser: process.env.EMAIL_USER,
            emailHost: process.env.EMAIL_HOST,
            emailPort: parseInt(process.env.EMAIL_PORT || '587', 10),
            emailPassword: process.env.EMAIL_PASSWORD,
            emailSecure: process.env.EMAIL_SECURE === 'true',
            defaultSenderEmail: process.env.DEFAULT_SENDER_EMAIL || process.env.EMAIL_USER,
            stripeSecretKey: process.env.STRIPE_SECRET_KEY,
            stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            stripePriceId: process.env.STRIPE_PRICE_ID || '',
            mailchimpApiKey: process.env.MAILCHIMP_API_KEY,
            clientUrl: process.env.CLIENT_URL
        };
    }
    get(key) {
        return this.config[key];
    }
    getAll() {
        return { ...this.config };
    }
    isDevelopment() {
        return this.config.nodeEnv === 'development';
    }
    isProduction() {
        return this.config.nodeEnv === 'production';
    }
    isTest() {
        return this.config.nodeEnv === 'test';
    }
}
// Export singleton instance
exports.config = new ConfigService();
