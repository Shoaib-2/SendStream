// backend/src/routes/analytics.routes.ts
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { protect } from '../middleware/auth/auth.middleware';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { logger } from '../utils/logger';

const router = express.Router();

router.get(
  '/newsletter/:newsletterId',
  protect as RequestHandler,
  analyticsController.getNewsletterAnalytics
);

router.get('/summary', protect as RequestHandler, (req: Request, res: Response, next: NextFunction) => {
  const requestTime = Math.floor(Date.now());
  const lastRequestTime = req.app.locals.lastSummaryRequest;
  
  // Prevent duplicate requests within 2 seconds
  if (lastRequestTime && requestTime - lastRequestTime < 2000) {
    res.json(req.app.locals.lastSummaryData || {});
    return;
  }

  req.app.locals.lastSummaryRequest = requestTime;

  getDashboardSummary(req, res, next)
    .then(data => {
      req.app.locals.lastSummaryData = data;
    })
    .catch(next);
});

router.get('/growth', protect as RequestHandler, analyticsController.getGrowthData);
router.get('/activity', protect as RequestHandler, analyticsController.getRecentActivity);

const TRACKING_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
// Public route for tracking pixel
router.get('/track-open/:newsletterId/:subscriberId', async (req: Request, res: Response, next: NextFunction) => {
  const { newsletterId, subscriberId } = req.params;
  logger.info('Received open tracking request', { newsletterId, subscriberId }); 

  try {
    res.setHeader("Content-Type", "image/gif");
    res.send(TRACKING_PIXEL);
  } catch (error) {
    logger.error('Error tracking open:', error);
    res.setHeader("Content-Type", "image/gif");
    res.send(TRACKING_PIXEL);
  }
});

export default router;