// backend/src/routes/newsletter.routes.ts

import express from 'express';
import { newsletterController} from '../controllers/news.controller';
import { protect } from '../middleware/auth/auth.middleware';

const router = express.Router();

// Protected routes
router.use(protect);


router.route('/').get(newsletterController.getAll).post(newsletterController.create);
router.get('/stats', newsletterController.getNewsletterStats);


router.route('/:id')
  .get(newsletterController.getOne) 
 .patch(newsletterController.update)
 .delete(newsletterController.delete);


router.post('/:id/send', newsletterController.send);
router.post('/:id/schedule', newsletterController.schedule);


// Public route for tracking
router.get('/newsletters/track-open/:newsletterId/:subscriberId', async (req, res, next) => {
  try {
    const { newsletterId, subscriberId } = req.params;
    console.log('Tracking open:', { newsletterId, subscriberId });
    
    await newsletterController.trackOpen(req, res);
    
    // Send a transparent 1x1 pixel
    res.setHeader('Content-Type', 'image/gif');
    res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
  } catch (error) {
    console.error('Tracking pixel error:', error);
    res.status(500).send('Tracking error');
  }
});

export default router;