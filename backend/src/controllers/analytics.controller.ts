// backend/src/controllers/analytics.controller.ts
import { Request, Response, NextFunction } from 'express';
import Analytics from '../models/analytics';
import { analyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';
import Newsletter from '../models/Newsletter';
import Subscriber from '../models/Subscriber';

export class AnalyticsController {
  /**
   * Get newsletter analytics
   */
  async getNewsletterAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { newsletterId } = req.params;
      const analytics = await Analytics.findOne({ newsletterId });

      res.json({
        status: 'success',
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting analytics:', error);
      next(error);
    }
  }

  async getGrowthData(req: Request, res: Response, next: NextFunction) {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const subscribers = await Subscriber.find({
        createdBy: req.user?._id,
        subscribed: { $gte: sixMonthsAgo }
      }).sort('subscribed').lean();

      const monthlyData: { [key: string]: number } = {};
      subscribers.forEach(sub => {
        const month = new Date(sub.subscribed).toLocaleString('default', { month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      });

      const growthData = Object.entries(monthlyData).map(([month, subscribers]) => ({
        month,
        subscribers
      }));

      res.json({
        status: 'success',
        data: growthData
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecentActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const newsletters = await Newsletter.find({
        createdBy: req.user?._id,
        status: 'sent'
      })
      .sort('-sentDate')
      .limit(5)
      .lean();

      const activity = await Promise.all(newsletters.map(async (n) => {
        const recipientsCount = await Subscriber.countDocuments({ newsletterId: n._id });
        return {
          title: n.title,
          recipients: recipientsCount,
          time: n.sentDate || new Date()
        };
      }));

      res.json({
        status: 'success',
        data: activity
      });
    } catch (error) {
      next(error);
    }
  }


  /**
   * Track pixel open
   */
  async trackPixel(req: Request, res: Response, next: NextFunction) {
    try {
      const { newsletterId, subscriberId } = req.params;
      await analyticsService.trackOpen(newsletterId, subscriberId);

      // Return a 1x1 transparent GIF
      res.writeHead(200, {
        'Content-Type': 'image/gif',
        'Content-Length': '43'
      });
      res.setHeader('Content-Type', 'image/gif');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } catch (error) {
      logger.error('Error tracking pixel:', error);
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();