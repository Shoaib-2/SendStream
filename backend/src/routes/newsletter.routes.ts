// backend/src/routes/newsletter.routes.ts

import express from 'express';
import { newsletterController} from '../controllers/newsletter.controller';
import { protect } from '../middleware/auth/auth.middleware';

const router = express.Router();

// Protected routes
router.use(protect);


router.route('/').get((req, res, next) => newsletterController.getAll(req, res, next)).post((req, res, next) => newsletterController.create(req, res, next));
router.get('/stats', (req, res, next) => newsletterController.getNewsletterStats(req, res, next));


router.route('/:id')
  .get(newsletterController.getOne) 
 .patch(newsletterController.update)
 .delete(newsletterController.delete);


router.post('/:id/send', newsletterController.send);
router.route('/:id/schedule').post(async (req, res, next) => {
  await newsletterController.schedule(req, res, next);
});


// Public route for tracking
router.get('/newsletters/track-open/:newsletterId/:subscriberId', async (req, res, next) => {
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