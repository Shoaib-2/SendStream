import express from 'express';
import { settingsController } from '../controllers/settings.controller';
import { protect } from '../middleware/auth/auth.middleware';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Helper to convert class methods to route handlers
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => (req: Request, res: Response, next: NextFunction) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

// Get and update settings
router.get('/', asyncHandler((req, res, next) => settingsController.getSettings(req, res, next)));
router.put('/', asyncHandler((req, res, next) => settingsController.updateSettings(req, res, next)));

// Test and enable integrations
router.post('/test/:type', asyncHandler((req, res, next) => settingsController.testIntegration(req, res, next)));
router.post('/enable/:type', asyncHandler((req, res, next) => settingsController.enableIntegration(req, res, next)));

// Mailchimp operations
router.post('/newsletter', asyncHandler((req, res, next) => settingsController.sendNewsletter(req, res, next)));
router.post('/newsletter/schedule', asyncHandler((req, res, next) => settingsController.scheduleNewsletter(req, res, next)));
router.get('/subscribers/stats', asyncHandler((req, res, next) => settingsController.getSubscriberStats(req, res, next)));
router.get('/campaigns/:campaignId/stats', asyncHandler((req, res, next) => settingsController.getCampaignStats(req, res, next)));
router.post('/sync-subscribers', asyncHandler((req, res, next) => settingsController.syncSubscribers(req, res, next)));

export default router;