// backend/src/controllers/analytics.controller.ts
import { Request, Response, NextFunction } from 'express';
import Analytics from '../models/analytics';
import { analyticsService } from '../services/analytics.service';
import { logger } from '../utils/logger';

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