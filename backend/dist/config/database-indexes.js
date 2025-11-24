"use strict";
/**
 * Database Index Management
 * This file ensures proper indexing on all MongoDB collections for optimal performance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDatabaseIndexes = createDatabaseIndexes;
exports.listDatabaseIndexes = listDatabaseIndexes;
exports.dropDatabaseIndexes = dropDatabaseIndexes;
exports.rebuildDatabaseIndexes = rebuildDatabaseIndexes;
const User_1 = __importDefault(require("../models/User"));
const Newsletter_1 = __importDefault(require("../models/Newsletter"));
const Subscriber_1 = __importDefault(require("../models/Subscriber"));
const Settings_1 = __importDefault(require("../models/Settings"));
const analytics_1 = __importDefault(require("../models/analytics"));
const logger_1 = require("../utils/logger");
/**
 * Create all necessary database indexes
 * Call this function during application startup
 */
async function createDatabaseIndexes() {
    try {
        logger_1.logger.info('Creating database indexes...');
        // Helper function to safely create index
        const safeCreateIndex = async (collection, spec, options = {}) => {
            try {
                await collection.createIndex(spec, options);
            }
            catch (error) {
                // Ignore duplicate index errors (code 86)
                if (error.code !== 86) {
                    throw error;
                }
            }
        };
        // User indexes
        await safeCreateIndex(User_1.default.collection, { email: 1 }, { unique: true });
        await safeCreateIndex(User_1.default.collection, { stripeCustomerId: 1 }, { sparse: true });
        await safeCreateIndex(User_1.default.collection, { passwordResetToken: 1 }, { sparse: true });
        await safeCreateIndex(User_1.default.collection, { subscriptionStatus: 1 });
        await safeCreateIndex(User_1.default.collection, { trialEndsAt: 1 }, { sparse: true });
        logger_1.logger.info('✓ User indexes created');
        // Newsletter indexes
        await safeCreateIndex(Newsletter_1.default.collection, { createdBy: 1, status: 1 });
        await safeCreateIndex(Newsletter_1.default.collection, { createdBy: 1, createdAt: -1 });
        await safeCreateIndex(Newsletter_1.default.collection, { status: 1, scheduledDate: 1 });
        await safeCreateIndex(Newsletter_1.default.collection, { scheduledDate: 1 }, { sparse: true });
        await safeCreateIndex(Newsletter_1.default.collection, { sentDate: 1 }, { sparse: true });
        await safeCreateIndex(Newsletter_1.default.collection, { 'contentQuality.qualityScore': -1 });
        logger_1.logger.info('✓ Newsletter indexes created');
        // Subscriber indexes
        // Note: Compound index (email + createdBy) already exists in schema
        await safeCreateIndex(Subscriber_1.default.collection, { createdBy: 1, status: 1 });
        await safeCreateIndex(Subscriber_1.default.collection, { createdBy: 1, createdAt: -1 });
        await safeCreateIndex(Subscriber_1.default.collection, { email: 1 });
        await safeCreateIndex(Subscriber_1.default.collection, { status: 1 });
        await safeCreateIndex(Subscriber_1.default.collection, { createdAt: -1 });
        await safeCreateIndex(Subscriber_1.default.collection, { source: 1 }, { sparse: true });
        logger_1.logger.info('✓ Subscriber indexes created');
        // Settings indexes
        // Note: userId unique index already exists in schema
        await safeCreateIndex(Settings_1.default.collection, { 'mailchimp.enabled': 1 }, { sparse: true });
        await safeCreateIndex(Settings_1.default.collection, { 'mailchimp.enabled': 1, 'mailchimp.autoSync': 1 }, { sparse: true });
        logger_1.logger.info('✓ Settings indexes created');
        // Analytics indexes
        await safeCreateIndex(analytics_1.default.collection, { newsletterId: 1 }, { unique: true });
        await safeCreateIndex(analytics_1.default.collection, { createdBy: 1 });
        await safeCreateIndex(analytics_1.default.collection, { createdBy: 1, createdAt: -1 });
        await safeCreateIndex(analytics_1.default.collection, { 'opens.count': -1 });
        await safeCreateIndex(analytics_1.default.collection, { 'clicks.count': -1 });
        await safeCreateIndex(analytics_1.default.collection, { 'opens.details.timestamp': 1 });
        await safeCreateIndex(analytics_1.default.collection, { 'clicks.details.timestamp': 1 });
        logger_1.logger.info('✓ Analytics indexes created');
        logger_1.logger.info('All database indexes created successfully');
    }
    catch (error) {
        logger_1.logger.error('Error creating database indexes:', error);
        throw error;
    }
}
/**
 * List all indexes for each collection
 * Useful for debugging and verification
 */
async function listDatabaseIndexes() {
    try {
        logger_1.logger.info('Listing database indexes...');
        const userIndexes = await User_1.default.collection.getIndexes();
        logger_1.logger.info('User indexes:', userIndexes);
        const newsletterIndexes = await Newsletter_1.default.collection.getIndexes();
        logger_1.logger.info('Newsletter indexes:', newsletterIndexes);
        const subscriberIndexes = await Subscriber_1.default.collection.getIndexes();
        logger_1.logger.info('Subscriber indexes:', subscriberIndexes);
        const settingsIndexes = await Settings_1.default.collection.getIndexes();
        logger_1.logger.info('Settings indexes:', settingsIndexes);
        const analyticsIndexes = await analytics_1.default.collection.getIndexes();
        logger_1.logger.info('Analytics indexes:', analyticsIndexes);
        return {
            user: userIndexes,
            newsletter: newsletterIndexes,
            subscriber: subscriberIndexes,
            settings: settingsIndexes,
            analytics: analyticsIndexes
        };
    }
    catch (error) {
        logger_1.logger.error('Error listing database indexes:', error);
        throw error;
    }
}
/**
 * Drop all non-essential indexes (useful for testing or rebuilding)
 * WARNING: Only use in development/testing
 */
async function dropDatabaseIndexes() {
    try {
        logger_1.logger.warn('Dropping database indexes...');
        await User_1.default.collection.dropIndexes();
        await Newsletter_1.default.collection.dropIndexes();
        await Subscriber_1.default.collection.dropIndexes();
        await Settings_1.default.collection.dropIndexes();
        await analytics_1.default.collection.dropIndexes();
        logger_1.logger.info('All indexes dropped successfully');
    }
    catch (error) {
        logger_1.logger.error('Error dropping database indexes:', error);
        throw error;
    }
}
/**
 * Rebuild all indexes (drop and recreate)
 * Useful when index definitions change
 */
async function rebuildDatabaseIndexes() {
    try {
        logger_1.logger.info('Rebuilding database indexes...');
        // Drop existing indexes (except _id)
        await dropDatabaseIndexes();
        // Recreate all indexes
        await createDatabaseIndexes();
        logger_1.logger.info('Database indexes rebuilt successfully');
    }
    catch (error) {
        logger_1.logger.error('Error rebuilding database indexes:', error);
        throw error;
    }
}
