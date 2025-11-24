import express from 'express';
import { register, login, logout, forgotPassword, resetPassword, checkTrialEligibility } from '../controllers/auth.controller';

const router = express.Router();

// Existing routes - wrapped to ensure proper typing
router.post('/register', (req, res, next) => { register(req, res, next); });
router.post('/login', (req, res, next) => { login(req, res, next); });
router.post('/logout', (req, res) => { logout(req, res); });
router.get('/check-trial-eligibility', (req, res, next) => { checkTrialEligibility(req, res, next); });

// Make sure these routes are added and match your API calls
router.post('/forgot-password', (req, res, next) => { forgotPassword(req, res, next); });
router.post('/reset-password/:token', (req, res, next) => { resetPassword(req, res, next); });

// Add route for verifying cookie authentication
router.get('/me', (req, res) => {
  // The protect middleware will handle authentication
  // This route is just for verifying the cookie
  res.status(200).json({
    status: 'success',
    user: req.user
  });
});

export default router;