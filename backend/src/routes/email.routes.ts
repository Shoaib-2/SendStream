// backend/src/routes/email.routes.ts
import express, { RequestHandler } from 'express';
import { emailController } from '../controllers/email.controller';
import { protect } from '../middleware/auth/auth.middleware';
import { rateLimiters } from '../middleware/rateLimiter.middleware';

const router = express.Router();

router.get(
  '/usage',
  protect as RequestHandler,
  rateLimiters.analytics as RequestHandler,
  emailController.getUsage
);

router.post(
  '/newsletter/:newsletterId/send',
  protect as RequestHandler,
  rateLimiters.email as RequestHandler, // Strict rate limiting for email sending
  emailController.sendNewsletter
);


export default router;