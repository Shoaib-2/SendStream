import express from 'express';
import { settingsController } from '../controllers/settings.controller';
import { protect } from '../middleware/auth/auth.middleware';
import { MailchimpService } from '../services/Integrations';


const router = express.Router();

// All routes require authentication
router.use(protect);

// Get and update settings
router.get('/', async (req, res, next) => {
	try {
		await settingsController.getSettings(req, res, next);
	} catch (error) {
		next(error);
	}
});
router.put('/', settingsController.updateSettings);
router.post('/newsletter', settingsController.sendNewsletter);
router.post('/newsletter/schedule', settingsController.scheduleNewsletter);
router.get('/subscribers/stats', settingsController.getSubscriberStats);
router.get('/campaigns/:campaignId/stats', settingsController.getCampaignStats);

// Test integrations
router.post('/test/:type', async (req, res, next) => {
	try {
	  const { type } = req.params;
	  if (type === 'mailchimp') {
		const mailchimpService = new MailchimpService(
		  process.env.MAILCHIMP_API_KEY!,
		  'us11'  // Use the server prefix from the Mailchimp account
		);
		const result = await mailchimpService.testConnection();
		res.json(result);
	  } else {
		next(new Error('Invalid integration type'));
	  }
	} catch (error) {
	  next(error);
	}
  });

export default router; 