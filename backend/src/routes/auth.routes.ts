import express, { RequestHandler } from 'express';
import { register, login, logout, forgotPassword, resetPassword } from '../controllers/auth.controller';

const router = express.Router();

// Existing routes
router.post('/register', register as RequestHandler);
router.post('/login', login as RequestHandler);
router.post('/logout', logout as RequestHandler);

// Make sure these routes are added and match your API calls
router.post('/forgot-password', forgotPassword as RequestHandler);
router.post('/reset-password/:token', resetPassword as RequestHandler);

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