// backend/src/routes/newsletter.routes.ts
import express from 'express';
import { newsletterController } from '../controllers/news.controller';
import { protect } from '../middleware/auth/auth.middleware';

const router = express.Router();

router.use(protect); // Protect all newsletter routes

router
  .route('/')
  .get(newsletterController.getAll)
  .post(newsletterController.create);

router
  .route('/:id')
  .patch(newsletterController.update)
  .delete(newsletterController.delete);

router.post('/:id/schedule', newsletterController.schedule);

export default router;