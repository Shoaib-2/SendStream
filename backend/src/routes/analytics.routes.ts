// backend/src/routes/analytics.routes.ts
import express from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { protect } from '../middleware/auth/auth.middleware';

const router = express.Router();

router.get(
  '/newsletter/:newsletterId',
  protect,
  analyticsController.getNewsletterAnalytics
);

// Public route for tracking pixel
router.get(
  '/track/:newsletterId/:subscriberId',
  analyticsController.trackPixel
);

export default router;