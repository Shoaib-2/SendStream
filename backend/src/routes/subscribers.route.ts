import { Router } from 'express';
import { asyncHandler } from '../middleware/error.middleware';
import { 
  getSubscribers, 
  createSubscriber, 
  deleteSubscriber, 
  importSubscribers, 
  exportSubscribers, 
  bulkDeleteSubscribers,
  unsubscribeSubscriber,
  updateSubscriber
} from '../controllers/subs.controller';
import { protect } from '../middleware/auth/auth.middleware';
import { checkSubscription } from '../middleware/susbcription.middleware';
import { RequestHandler } from 'express';

const router = Router();

// Public unsubscribe route - no auth required
router.get('/unsubscribe/:token', asyncHandler(unsubscribeSubscriber));

// Protected routes - fix the type error by casting protect to RequestHandler
router.use(protect as RequestHandler);

// Add subscription check for premium features
router.use(checkSubscription as RequestHandler);

router.route('/').get(getSubscribers).post(createSubscriber);
router.route('/import').post(asyncHandler(importSubscribers));
router.route('/export').get(exportSubscribers);
router.route('/:id/status').patch(asyncHandler(updateSubscriber));
router.route('/bulk-delete').post(asyncHandler(bulkDeleteSubscribers));
router.route('/:id').delete(asyncHandler(deleteSubscriber));

export default router;