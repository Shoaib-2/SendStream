import express, { RequestHandler } from 'express';
import { newsletterController} from '../controllers/newsletter.controller';
import { protect } from '../middleware/auth/auth.middleware';
import { checkSubscription } from '../middleware/susbcription.middleware';

const router = express.Router();

// Apply auth middleware
router.use(protect as express.RequestHandler);

// Add subscription check for premium features
router.use(checkSubscription as express.RequestHandler);

router.route('/')
  .get((req, res, next) => newsletterController.getAll(req, res, next))
  .post((req, res, next) => newsletterController.create(req, res, next));

router.get('/stats', (req, res, next) => newsletterController.getNewsletterStats(req, res, next));

router.route('/:id')
  .get(newsletterController.getOne as RequestHandler) 
  .patch(newsletterController.update as RequestHandler)
  .delete(newsletterController.delete as RequestHandler);

// Fix the send route by casting to RequestHandler
router.post('/:id/send', newsletterController.send as RequestHandler);

// Fix the schedule route
router.route('/:id/schedule').post(async (req, res, next) => {
  await newsletterController.schedule(req, res, next);
});

// Public route for tracking - no auth/subscription required
router.get('/newsletters/track-open/:newsletterId/:subscriberId', async (req, res, _next) => {
  try {
    const { newsletterId, subscriberId } = req.params;
    console.log('Tracking open:', { newsletterId, subscriberId });
    
    res.setHeader('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    console.error('Tracking pixel error:', error);
    res.status(500).send('Tracking error');
  }
});

export default router;