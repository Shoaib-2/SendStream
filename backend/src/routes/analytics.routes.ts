// backend/src/routes/analytics.routes.ts
import express, {Request, Response, NextFunction } from 'express';
import { AnalyticsController, analyticsController } from '../controllers/analytics.controller';
import { protect } from '../middleware/auth/auth.middleware';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { logger } from '../utils/logger';
import { newsletterController } from '../controllers/news.controller';
import { analyticsService } from '../services/analytics.service';

const router = express.Router();

router.get(
  '/newsletter/:newsletterId',
  protect,
  analyticsController.getNewsletterAnalytics
);

router.get('/summary', protect, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await getDashboardSummary(req, res, next);
  } catch (error) {
    console.error('Error in summary route:', error);
    next(error);
  }
});

router.get('/growth', protect, analyticsController.getGrowthData);
router.get('/activity', protect, analyticsController.getRecentActivity);


const TRACKING_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
// Public route for tracking pixel
router.get('/track-open/:newsletterId/:subscriberId', async (req: Request, res: Response, next: NextFunction) => {
  const { newsletterId, subscriberId } = req.params;
  logger.info('Received open tracking request', { newsletterId, subscriberId }); 

  await newsletterController.trackOpen(req, res);
  res.send(TRACKING_PIXEL);
});

export default router;