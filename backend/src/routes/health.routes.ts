import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy'
  });
});

export default router;
