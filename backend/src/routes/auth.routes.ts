import express, { RequestHandler } from 'express';
import { register, login, logout, forgotPassword, resetPassword, checkTrialEligibility } from '../controllers/auth.controller';
import { rateLimiters } from '../middleware/rateLimiter.middleware';

const router = express.Router();

// Apply stricter rate limiting to auth routes
router.post('/register', rateLimiters.auth as RequestHandler, register as RequestHandler);
router.post('/login', rateLimiters.auth as RequestHandler, login as RequestHandler);
router.post('/logout', logout);
router.get('/check-trial-eligibility', rateLimiters.api as RequestHandler, checkTrialEligibility as RequestHandler);

// Password reset with auth rate limiting
router.post('/forgot-password', rateLimiters.auth as RequestHandler, forgotPassword as RequestHandler);
router.post('/reset-password/:token', rateLimiters.auth as RequestHandler, resetPassword as RequestHandler);

// Add route for verifying cookie authentication
router.get('/me', rateLimiters.api as RequestHandler, (req, res) => {
  // The protect middleware will handle authentication
  // This route is just for verifying the cookie
  res.status(200).json({
    status: 'success',
    user: req.user
  });
});

export default router;