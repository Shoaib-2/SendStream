// backend/src/routes/newsletter.routes.ts
import express from 'express';
import { 
  getNewsletters, 
  createNewsletter, 
  updateNewsletter,
  sendNewsletter 
} from '../controllers/news.controller';

const router = express.Router();

router.get('/', getNewsletters);
router.post('/', createNewsletter);
router.patch('/:id', updateNewsletter);
router.post('/:id/send', sendNewsletter);

export default router;