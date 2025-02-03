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
      const analytics = await this.getOrCreateAnalytics(newsletterId);
      
      await Analytics.findByIdAndUpdate(analytics._id, {
        $inc: { 'opens.count': 1 },
        $push: {
          'opens.details': {
            subscriberId,
            timestamp: new Date()
          }
        }
      });

      await this.updateNewsletterMetrics(newsletterId);
    } catch (error) {
      logger.error('Error tracking open:', error);
      throw new APIError(500, 'Failed to track email open');
    }
  }

  /**
   * Track link click
   */
  async trackClick(newsletterId: string, subscriberId: string, url: string) {
    try {
      const analytics = await this.getOrCreateAnalytics(newsletterId);
      
      await Analytics.findByIdAndUpdate(analytics._id, {
        $inc: { 'clicks.count': 1 },
        $push: {
          'clicks.details': {
            subscriberId,
            url,
            timestamp: new Date()
          }
        }
      });

      await this.updateNewsletterMetrics(newsletterId);
    } catch (error) {
      logger.error('Error tracking click:', error);
      throw new APIError(500, 'Failed to track link click');
    }
  }

  /**
   * Track bounce
   */
  async trackBounce(newsletterId: string, subscriberId: string, reason: string) {
    try {
      const analytics = await this.getOrCreateAnalytics(newsletterId);
      
      await Analytics.findByIdAndUpdate(analytics._id, {
        $inc: { 'bounces.count': 1 },
        $push: {
          'bounces.details': {
            subscriberId,
            reason,
            timestamp: new Date()
          }
        }
      });
    } catch (error) {
      logger.error('Error tracking bounce:', error);
      throw new APIError(500, 'Failed to track bounce');
    }
  }

  /**
   * Get analytics for a newsletter
   */
  private async getOrCreateAnalytics(newsletterId: string) {
    let analytics = await Analytics.findOne({ newsletterId });
    
    if (!analytics) {
      analytics = await Analytics.create({ newsletterId });
    }
    
    return analytics;
  }

  /**
   * Update newsletter metrics
   */
  private async updateNewsletterMetrics(newsletterId: string) {
    const analytics = await Analytics.findOne({ newsletterId });
    const newsletter = await Newsletter.findById(newsletterId);

    if (analytics && newsletter) {
      const totalSent = newsletter.sentTo || 0;
      const openRate = totalSent ? (analytics.opens.count / totalSent) * 100 : 0;
      const clickRate = analytics.opens.count ? (analytics.clicks.count / analytics.opens.count) * 100 : 0;

      await Newsletter.findByIdAndUpdate(newsletterId, {
        openRate,
        clickRate
      });
    }
  }
}

export const analyticsService = new AnalyticsService();