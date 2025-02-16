// backend/src/services/analytics.service.ts
import { logger } from '../utils/logger';
import Analytics from '../models/analytics';
import Newsletter from '../models/Newsletter';
import { APIError } from '../utils/errors';

export class AnalyticsService {
  /**
   * Track email open
   */
  async trackOpen(newsletterId: string, subscriberId: string) {
    try {
      logger.info('Tracking open for newsletter', { newsletterId, subscriberId });

      // Get the newsletter to get the createdBy field
      const newsletter = await Newsletter.findById(newsletterId);
      if (!newsletter) {
        throw new Error('Newsletter not found');
      }

      let analytics = await Analytics.findOne({ newsletterId });
      
      if (!analytics) {
        analytics = await Analytics.create({
          newsletterId,
          createdBy: newsletter.createdBy,  // Set the createdBy field
          opens: { count: 0, details: [] },
          clicks: { count: 0, details: [] },
          bounces: { count: 0, details: [] }
        });
      }

      // Update opens count and add details
      await Analytics.findByIdAndUpdate(analytics._id, {
        $inc: { 'opens.count': 1 },
        $push: {
          'opens.details': {
            subscriberId,
            timestamp: new Date()
          }
        }
      });

      logger.info('Successfully recorded open event', { newsletterId, subscriberId });
      return true;
    } catch (error) {
      logger.error('Error tracking open:', error);
      throw new APIError(500, 'Failed to track email open');
    }
  }

  /**
   * Get analytics for a newsletter
   */
  async getNewsletterAnalytics(newsletterId: string) {
    try {
      const analytics = await Analytics.findOne({ newsletterId });
      return analytics;
    } catch (error) {
      logger.error('Error getting analytics:', error);
      throw new APIError(500, 'Failed to get newsletter analytics');
    }
  }

  async trackUnsubscribe(newsletterId: string, subscriberId: string) {
    try {
      const newsletter = await Newsletter.findById(newsletterId);
      if (!newsletter) {
        throw new Error('Newsletter not found');
      }

      let analytics = await Analytics.findOne({ newsletterId });
      if (!analytics) {
        analytics = await Analytics.create({
          newsletterId,
          createdBy: newsletter.createdBy,
          opens: { count: 0, details: [] },
          clicks: { count: 0, details: [] },
          bounces: { count: 0, details: [] },
          unsubscribes: { count: 0, details: [] }
        });
      }

      await Analytics.findByIdAndUpdate(analytics._id, {
        $inc: { 'unsubscribes.count': 1 },
        $push: {
          'unsubscribes.details': {
            subscriberId,
            timestamp: new Date()
          }
        }
      });

      logger.info('Tracked unsubscribe event', { newsletterId, subscriberId });
    } catch (error) {
      logger.error('Error tracking unsubscribe:', error);
      throw new APIError(500, 'Failed to track unsubscribe');
    }
  }
}

export const analyticsService = new AnalyticsService();