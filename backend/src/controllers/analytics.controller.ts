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
      const newsletter = await Newsletter.findById(newsletterId);

      res.json({
        status: 'success',
        data: {
          ...analytics?.toObject(),
          contentQuality: newsletter?.contentQuality
        }
      });
    } catch (error) {
      logger.error('Error getting analytics:', error);
      next(error);
    }
  }

  async getGrowthData(req: Request, res: Response, next: NextFunction) {
    try {
      // Get ALL subscribers, not just from the last 6 months
      const allSubscribers = await Subscriber.find({
        createdBy: req.user?._id,
      }).sort('subscribed').lean();
  
      // Create a map to store monthly subscriber counts
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      // Create ordered array of the last 6 months with year info for accurate comparison
      const lastSixMonths = [];
      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const yearOffset = (currentMonth - i < 0) ? -1 : 0;
        const year = currentYear + yearOffset;
        lastSixMonths.push({
          monthIndex,
          monthName: months[monthIndex],
          year
        });
      }
      
      // Calculate cumulative subscriber count for each month
      const growthData = lastSixMonths.map((monthInfo, index) => {
        // For each month, count subscribers who joined on or before this month
        const count = allSubscribers.filter(sub => {
          const subDate = new Date(sub.subscribed);
          const subMonth = subDate.getMonth();
          const subYear = subDate.getFullYear();
          
          // Include if the subscription is from an earlier year
          if (subYear < monthInfo.year) return true;
          
          // Or if it's the same year and earlier/same month
          if (subYear === monthInfo.year && subMonth <= monthInfo.monthIndex) return true;
          
          return false;
        }).length;
        
        return {
          month: monthInfo.monthName,
          subscribers: count
        };
      });
  
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
          time: n.sentDate || new Date(),
          contentQuality: n.contentQuality
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