// backend/src/routes/email.routes.ts
import express, { RequestHandler } from 'express';
import { emailController } from '../controllers/email.controller';
import { protect } from '../middleware/auth/auth.middleware';

const router = express.Router();

router.get(
  '/usage',
  protect as RequestHandler,
  emailController.getUsage
);

router.post(
  '/newsletter/:newsletterId/send',
  protect as RequestHandler,
  emailController.sendNewsletter
);


export default router;