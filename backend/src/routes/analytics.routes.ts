// backend/src/routes/analytics.routes.ts
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { protect } from '../middleware/auth/auth.middleware';
import { checkSubscription} from '../middleware/susbcription.middleware';
import { getDashboardSummary } from '../controllers/dashboard.controller';
import { logger } from '../utils/logger';

const router = express.Router();

// Apply auth middleware to all protected routes
router.use(protect as RequestHandler);

// Add subscription check for premium features
router.use(checkSubscription as RequestHandler);

router.get(
  '/newsletter/:newsletterId',
  analyticsController.getNewsletterAnalytics
);

router.get('/summary', (req: Request, res: Response, next: NextFunction) => {
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

router.get('/growth', analyticsController.getGrowthData);
router.get('/activity', analyticsController.getRecentActivity);

const TRACKING_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
// Public route for tracking pixel - no auth/subscription required
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