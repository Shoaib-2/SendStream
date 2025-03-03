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

const router = Router();

// Public unsubscribe route
router.get('/unsubscribe/:token', asyncHandler(unsubscribeSubscriber));

// Protected routes
router.use(protect);
router.route('/').get(getSubscribers).post(createSubscriber);
router.route('/import').post(asyncHandler(importSubscribers));
router.route('/export').get(exportSubscribers);
router.route('/:id/status').patch(asyncHandler(updateSubscriber));
router.route('/bulk-delete').post(asyncHandler(bulkDeleteSubscribers));
router.route('/:id').delete(asyncHandler(deleteSubscriber));

export default router;