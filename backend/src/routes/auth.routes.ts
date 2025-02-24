import express, { RequestHandler } from 'express';
import { register, login, logout } from '../controllers/auth.controller';

const router = express.Router();

router.post('/register', register as RequestHandler);
router.post('/login', login as RequestHandler);
router.post('/logout', logout as RequestHandler);

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