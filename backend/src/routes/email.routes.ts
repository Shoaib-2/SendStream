// backend/src/routes/email.routes.ts
import express from 'express';
import { emailController } from '../controllers/email.controller';
import { protect } from '../middleware/auth/auth.middleware';

const router = express.Router();

router.post(
  '/newsletter/:newsletterId/send',
  protect,
  emailController.sendNewsletter
);

router.post(
  '/test',
  protect,
  emailController.sendTest
);

export default router;