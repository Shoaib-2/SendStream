/**
 * Database Index Management
 * This file ensures proper indexing on all MongoDB collections for optimal performance
 */

import User from '../models/User';
import Newsletter from '../models/Newsletter';
import Subscriber from '../models/Subscriber';
import Settings from '../models/Settings';
import Analytics from '../models/analytics';
import { AIUsage } from '../models/AIUsage';
import { logger } from '../utils/logger';

/**
 * Create all necessary database indexes
 * Call this function during application startup
 */
export async function createDatabaseIndexes() {
  try {
    logger.info('Creating database indexes...');

    // Helper function to safely create index
    const safeCreateIndex = async (collection: any, spec: any, options: any = {}) => {
      try {
        await collection.createIndex(spec, options);
      } catch (error: any) {
        // Ignore duplicate index errors (code 86)
        if (error.code !== 86) {
          throw error;
        }
      }
    };

    // User indexes
    await safeCreateIndex(User.collection, { email: 1 }, { unique: true });
    await safeCreateIndex(User.collection, { stripeCustomerId: 1 }, { sparse: true });
    await safeCreateIndex(User.collection, { stripeSubscriptionId: 1 }, { sparse: true });
    await safeCreateIndex(User.collection, { passwordResetToken: 1 }, { sparse: true });
    await safeCreateIndex(User.collection, { subscriptionStatus: 1 });
    await safeCreateIndex(User.collection, { trialEndsAt: 1 }, { sparse: true });
    logger.info('✓ User indexes created');

    // Newsletter indexes
    await safeCreateIndex(Newsletter.collection, { createdBy: 1, status: 1 });
    await safeCreateIndex(Newsletter.collection, { createdBy: 1, createdAt: -1 });
    await safeCreateIndex(Newsletter.collection, { status: 1, scheduledDate: 1 });
    await safeCreateIndex(Newsletter.collection, { scheduledDate: 1 }, { sparse: true });
    await safeCreateIndex(Newsletter.collection, { sentDate: 1 }, { sparse: true });
    await safeCreateIndex(Newsletter.collection, { 'contentQuality.qualityScore': -1 });
    logger.info('✓ Newsletter indexes created');

    // Subscriber indexes
    // Note: Compound index (email + createdBy) already exists in schema
    await safeCreateIndex(Subscriber.collection, { createdBy: 1, status: 1 });
    await safeCreateIndex(Subscriber.collection, { createdBy: 1, createdAt: -1 });
    await safeCreateIndex(Subscriber.collection, { email: 1 });
    await safeCreateIndex(Subscriber.collection, { status: 1 });
    await safeCreateIndex(Subscriber.collection, { createdAt: -1 });
    await safeCreateIndex(Subscriber.collection, { source: 1 }, { sparse: true });
    logger.info('✓ Subscriber indexes created');

    // Settings indexes
    // Note: userId unique index already exists in schema
    await safeCreateIndex(Settings.collection, { 'mailchimp.enabled': 1 }, { sparse: true });
    await safeCreateIndex(
      Settings.collection,
      { 'mailchimp.enabled': 1, 'mailchimp.autoSync': 1 },
      { sparse: true }
    );
    logger.info('✓ Settings indexes created');

    // Analytics indexes
    await safeCreateIndex(Analytics.collection, { newsletterId: 1 }, { unique: true });
    await safeCreateIndex(Analytics.collection, { createdBy: 1 });
    await safeCreateIndex(Analytics.collection, { createdBy: 1, createdAt: -1 });
    await safeCreateIndex(Analytics.collection, { 'opens.count': -1 });
    await safeCreateIndex(Analytics.collection, { 'clicks.count': -1 });
    await safeCreateIndex(Analytics.collection, { 'opens.details.timestamp': 1 });
    await safeCreateIndex(Analytics.collection, { 'clicks.details.timestamp': 1 });
    logger.info('✓ Analytics indexes created');

    // AIUsage indexes
    // Note: Compound index (userId + featureType) already exists in schema with unique constraint
    await safeCreateIndex(AIUsage.collection, { userId: 1 });
    await safeCreateIndex(AIUsage.collection, { lastReset: 1 });
    await safeCreateIndex(AIUsage.collection, { featureType: 1 });
    logger.info('✓ AIUsage indexes created');

    logger.info('All database indexes created successfully');
  } catch (error) {
    logger.error('Error creating database indexes:', error);
    throw error;
  }
}

/**
 * List all indexes for each collection
 * Useful for debugging and verification
 */
export async function listDatabaseIndexes() {
  try {
    logger.info('Listing database indexes...');

    const userIndexes = await User.collection.getIndexes();
    logger.info('User indexes:', userIndexes);

    const newsletterIndexes = await Newsletter.collection.getIndexes();
    logger.info('Newsletter indexes:', newsletterIndexes);

    const subscriberIndexes = await Subscriber.collection.getIndexes();
    logger.info('Subscriber indexes:', subscriberIndexes);

    const settingsIndexes = await Settings.collection.getIndexes();
    logger.info('Settings indexes:', settingsIndexes);

    const analyticsIndexes = await Analytics.collection.getIndexes();
    logger.info('Analytics indexes:', analyticsIndexes);

    const aiUsageIndexes = await AIUsage.collection.getIndexes();
    logger.info('AIUsage indexes:', aiUsageIndexes);

    return {
      user: userIndexes,
      newsletter: newsletterIndexes,
      subscriber: subscriberIndexes,
      settings: settingsIndexes,
      analytics: analyticsIndexes,
      aiUsage: aiUsageIndexes
    };
  } catch (error) {
    logger.error('Error listing database indexes:', error);
    throw error;
  }
}

/**
 * Drop all non-essential indexes (useful for testing or rebuilding)
 * WARNING: Only use in development/testing
 */
export async function dropDatabaseIndexes() {
  try {
    logger.warn('Dropping database indexes...');

    await User.collection.dropIndexes();
    await Newsletter.collection.dropIndexes();
    await Subscriber.collection.dropIndexes();
    await Settings.collection.dropIndexes();
    await Analytics.collection.dropIndexes();
    await AIUsage.collection.dropIndexes();

    logger.info('All indexes dropped successfully');
  } catch (error) {
    logger.error('Error dropping database indexes:', error);
    throw error;
  }
}

/**
 * Rebuild all indexes (drop and recreate)
 * Useful when index definitions change
 */
export async function rebuildDatabaseIndexes() {
  try {
    logger.info('Rebuilding database indexes...');
    
    // Drop existing indexes (except _id)
    await dropDatabaseIndexes();
    
    // Recreate all indexes
    await createDatabaseIndexes();
    
    logger.info('Database indexes rebuilt successfully');
  } catch (error) {
    logger.error('Error rebuilding database indexes:', error);
    throw error;
  }
}
