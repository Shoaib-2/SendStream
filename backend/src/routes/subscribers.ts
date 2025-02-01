// backend/src/routes/subscribers.ts
import express from 'express';
import { getSubscribers, createSubscriber, deleteSubscriber } from '../controllers/subs.controller';

const router = express.Router();

router.get('/', getSubscribers);
router.post('/', createSubscriber);
router.delete('/:id', deleteSubscriber);

export default router;