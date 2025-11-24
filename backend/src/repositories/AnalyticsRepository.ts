import Analytics from '../models/analytics';
import { Types } from 'mongoose';

/**
 * AnalyticsRepository - Data access layer for Analytics model
 * Abstracts all database operations for newsletter analytics
 */
export class AnalyticsRepository {
  /**
   * Create new analytics record for a newsletter
   */
  async create(analyticsData: {
    newsletterId: string | Types.ObjectId;
    createdBy: string | Types.ObjectId;
  }) {
    return await Analytics.create(analyticsData);
  }

  /**
   * Find analytics by newsletter ID
   */
  async findByNewsletterId(newsletterId: string | Types.ObjectId) {
    return await Analytics.findOne({ newsletterId });
  }

  /**
   * Find analytics by newsletter ID with populations
   */
  async findByNewsletterIdWithDetails(newsletterId: string | Types.ObjectId) {
    return await Analytics.findOne({ newsletterId })
      .populate('opens.details.subscriberId', 'email name')
      .populate('clicks.details.subscriberId', 'email name')
      .populate('bounces.details.subscriberId', 'email name')
      .populate('unsubscribes.details.subscriberId', 'email name');
  }

  /**
   * Find all analytics for a user
   */
  async findByUserId(userId: string | Types.ObjectId) {
    return await Analytics.find({ createdBy: userId })
      .populate('newsletterId', 'title subject')
      .sort({ createdAt: -1 });
  }

  /**
   * Track email open event
   */
  async trackOpen(
    newsletterId: string | Types.ObjectId,
    subscriberId: string | Types.ObjectId
  ) {
    return await Analytics.findOneAndUpdate(
      { newsletterId },
      {
        $inc: { 'opens.count': 1 },
        $push: {
          'opens.details': {
            subscriberId,
            timestamp: new Date()
          }
        }
      },
      { new: true, upsert: true }
    );
  }

  /**
   * Track click event
   */
  async trackClick(
    newsletterId: string | Types.ObjectId,
    subscriberId: string | Types.ObjectId,
    url: string
  ) {
    return await Analytics.findOneAndUpdate(
      { newsletterId },
      {
        $inc: { 'clicks.count': 1 },
        $push: {
          'clicks.details': {
            subscriberId,
            url,
            timestamp: new Date()
          }
        }
      },
      { new: true, upsert: true }
    );
  }

  /**
   * Track bounce event
   */
  async trackBounce(
    newsletterId: string | Types.ObjectId,
    subscriberId: string | Types.ObjectId,
    reason: string
  ) {
    return await Analytics.findOneAndUpdate(
      { newsletterId },
      {
        $inc: { 'bounces.count': 1 },
        $push: {
          'bounces.details': {
            subscriberId,
            reason,
            timestamp: new Date()
          }
        }
      },
      { new: true, upsert: true }
    );
  }

  /**
   * Track unsubscribe event
   */
  async trackUnsubscribe(
    newsletterId: string | Types.ObjectId,
    subscriberId: string | Types.ObjectId,
    reason?: string
  ) {
    return await Analytics.findOneAndUpdate(
      { newsletterId },
      {
        $inc: { 'unsubscribes.count': 1 },
        $push: {
          'unsubscribes.details': {
            subscriberId,
            reason: reason || 'Not specified',
            timestamp: new Date()
          }
        }
      },
      { new: true, upsert: true }
    );
  }

  /**
   * Get summary statistics for a newsletter
   */
  async getStatsByNewsletterId(newsletterId: string | Types.ObjectId) {
    const analytics = await Analytics.findOne({ newsletterId });
    
    if (!analytics) {
      return {
        opens: { count: 0, details: [] },
        clicks: { count: 0, details: [] },
        bounces: { count: 0, details: [] },
        unsubscribes: { count: 0, details: [] }
      };
    }

    return {
      opens: analytics.opens || { count: 0, details: [] },
      clicks: analytics.clicks || { count: 0, details: [] },
      bounces: analytics.bounces || { count: 0, details: [] },
      unsubscribes: analytics.unsubscribes || { count: 0, details: [] }
    };
  }

  /**
   * Get aggregate analytics for all newsletters of a user
   */
  async getAggregateStatsByUser(userId: string | Types.ObjectId) {
    const results = await Analytics.aggregate([
      { $match: { createdBy: new Types.ObjectId(userId as string) } },
      {
        $group: {
          _id: null,
          totalOpens: { $sum: '$opens.count' },
          totalClicks: { $sum: '$clicks.count' },
          totalBounces: { $sum: '$bounces.count' },
          totalUnsubscribes: { $sum: '$unsubscribes.count' },
          newsletterCount: { $sum: 1 }
        }
      }
    ]);

    return results[0] || {
      totalOpens: 0,
      totalClicks: 0,
      totalBounces: 0,
      totalUnsubscribes: 0,
      newsletterCount: 0
    };
  }

  /**
   * Get analytics by date range
   */
  async getStatsByDateRange(
    userId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date
  ) {
    return await Analytics.find({
      createdBy: userId,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).populate('newsletterId', 'title subject sentDate');
  }

  /**
   * Get top performing newsletters
   */
  async getTopPerforming(
    userId: string | Types.ObjectId,
    limit: number = 5,
    metric: 'opens' | 'clicks' = 'opens'
  ) {
    const sortField = metric === 'opens' ? 'opens.count' : 'clicks.count';
    
    return await Analytics.find({ createdBy: userId })
      .populate('newsletterId', 'title subject sentDate')
      .sort({ [sortField]: -1 })
      .limit(limit);
  }

  /**
   * Delete analytics by newsletter ID
   */
  async deleteByNewsletterId(newsletterId: string | Types.ObjectId) {
    return await Analytics.findOneAndDelete({ newsletterId });
  }

  /**
   * Delete all analytics for a user
   */
  async deleteByUserId(userId: string | Types.ObjectId) {
    return await Analytics.deleteMany({ createdBy: userId });
  }

  /**
   * Get click-through rate for a newsletter
   */
  async getClickThroughRate(newsletterId: string | Types.ObjectId): Promise<number> {
    const analytics = await Analytics.findOne({ newsletterId });
    
    if (!analytics || !analytics.opens || analytics.opens.count === 0) {
      return 0;
    }

    const clickCount = analytics.clicks?.count || 0;
    const openCount = analytics.opens.count;
    
    return (clickCount / openCount) * 100;
  }

  /**
   * Get open rate for a newsletter (requires sentTo count from Newsletter)
   */
  async getOpenRate(newsletterId: string | Types.ObjectId, sentTo: number): Promise<number> {
    const analytics = await Analytics.findOne({ newsletterId });
    
    if (!analytics || !analytics.opens || sentTo === 0) {
      return 0;
    }

    return (analytics.opens.count / sentTo) * 100;
  }

  /**
   * Get engagement metrics for a newsletter
   */
  async getEngagementMetrics(newsletterId: string | Types.ObjectId, sentTo: number) {
    const analytics = await Analytics.findOne({ newsletterId });
    
    if (!analytics) {
      return {
        openRate: 0,
        clickRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        clickThroughRate: 0
      };
    }

    const opens = analytics.opens?.count || 0;
    const clicks = analytics.clicks?.count || 0;
    const bounces = analytics.bounces?.count || 0;
    const unsubscribes = analytics.unsubscribes?.count || 0;

    return {
      openRate: sentTo > 0 ? (opens / sentTo) * 100 : 0,
      clickRate: sentTo > 0 ? (clicks / sentTo) * 100 : 0,
      bounceRate: sentTo > 0 ? (bounces / sentTo) * 100 : 0,
      unsubscribeRate: sentTo > 0 ? (unsubscribes / sentTo) * 100 : 0,
      clickThroughRate: opens > 0 ? (clicks / opens) * 100 : 0
    };
  }

  /**
   * Get time-series data for opens and clicks
   */
  async getTimeSeriesData(
    userId: string | Types.ObjectId,
    days: number = 30
  ) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await Analytics.find({
      createdBy: userId,
      createdAt: { $gte: startDate }
    });

    // Process data into daily buckets
    const dailyData: { [key: string]: { opens: number; clicks: number } } = {};

    analytics.forEach((record) => {
      // Process opens
      record.opens?.details.forEach((detail: any) => {
        const date = new Date(detail.timestamp).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { opens: 0, clicks: 0 };
        }
        dailyData[date].opens++;
      });

      // Process clicks
      record.clicks?.details.forEach((detail: any) => {
        const date = new Date(detail.timestamp).toISOString().split('T')[0];
        if (!dailyData[date]) {
          dailyData[date] = { opens: 0, clicks: 0 };
        }
        dailyData[date].clicks++;
      });
    });

    return Object.keys(dailyData)
      .sort()
      .map((date) => ({
        date,
        opens: dailyData[date].opens,
        clicks: dailyData[date].clicks
      }));
  }

  /**
   * Count total analytics records
   */
  async count(userId?: string | Types.ObjectId): Promise<number> {
    const query = userId ? { createdBy: userId } : {};
    return await Analytics.countDocuments(query);
  }

  /**
   * Check if analytics exist for newsletter
   */
  async exists(newsletterId: string | Types.ObjectId): Promise<boolean> {
    const count = await Analytics.countDocuments({ newsletterId });
    return count > 0;
  }
}

export const analyticsRepository = new AnalyticsRepository();
