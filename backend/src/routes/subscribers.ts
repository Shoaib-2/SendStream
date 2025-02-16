import { Router, Request, Response, NextFunction } from 'express';
import { getSubscribers, createSubscriber, deleteSubscriber, importSubscribers, exportSubscribers, bulkDeleteSubscribers } from '../controllers/subs.controller';
import { protect } from '../middleware/auth/auth.middleware';
import Subscriber from '../models/Subscriber';
import Newsletter from '../models/Newsletter';
import { analyticsService } from '../services/analytics.service';
import { APIError } from '../utils/errors';
import { Document } from 'mongoose';

interface INewsletter extends Document {
  _id: string;
  createdBy: string;
  title: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  sentTo?: number;
  sentDate?: Date;
  scheduledDate?: Date;
  openRate?: number;
  clickRate?: number;
}

interface ISubscriber extends Document {
  _id: string;
  email: string;
  name: string;
  status: 'active' | 'unsubscribed';
  subscribed: Date;
  createdBy: string;
  unsubscribedAt?: Date;
}

const router = Router();

// Public unsubscribe route
router.get('/unsubscribe/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string') {
      throw new APIError(400, 'Invalid unsubscribe token');
    }

    const subscriberId = Buffer.from(token, 'base64').toString('utf-8');
    if (!subscriberId) {
      throw new APIError(400, 'Invalid unsubscribe token format');
    }

    const subscriber = await Subscriber.findByIdAndUpdate(subscriberId, {
      status: 'unsubscribed',
      unsubscribedAt: new Date()
    }) as ISubscriber;

    if (!subscriber) {
      throw new APIError(404, 'Subscriber not found');
    }

    // Record unsubscribe event in analytics
    const newsletters = await Newsletter.find({ createdBy: subscriber.createdBy }) as INewsletter[];
    if (newsletters.length > 0) {
      const latestNewsletter = newsletters[newsletters.length - 1];
      await analyticsService.trackUnsubscribe(
        latestNewsletter._id,
        subscriberId
      );
    }

    // Return a themed success page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Unsubscribed Successfully</title>
          <style>
            body { 
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              max-width: 600px; 
              margin: 40px auto; 
              text-align: center;
              line-height: 1.6;
              background-color: #0f172a;
              color: #e2e8f0;
              padding: 0 20px;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .message { 
              padding: 40px;
              background: #1e293b;
              border-radius: 12px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              margin: 20px 0;
              border: 1px solid #334155;
              width: 100%;
            }
            h2 { 
              color: #f8fafc; 
              margin-bottom: 24px;
              font-size: 24px;
              font-weight: 600;
            }
            p { 
              color: #cbd5e1; 
              margin: 16px 0;
              font-size: 15px;
            }
            .icon {
              width: 48px;
              height: 48px;
              margin-bottom: 20px;
              color: #38bdf8;
            }
            .button {
              display: inline-block;
              margin-top: 24px;
              padding: 12px 24px;
              background-color: #38bdf8;
              color: #0f172a;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              transition: all 0.2s;
            }
            .button:hover {
              background-color: #0ea5e9;
              transform: translateY(-1px);
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            }
            .footer {
              margin-top: 32px;
              font-size: 14px;
              color: #64748b;
            }
            @media (max-width: 480px) {
              body {
                margin: 0;
                padding: 0;
              }
              .message {
                padding: 30px 20px;
                margin: 0;
                border-radius: 0;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
              }
              h2 {
                font-size: 22px;
              }
            }
          </style>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="message">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h2>Successfully Unsubscribed</h2>
            <p>You've been removed from our mailing list and won't receive any more emails from us.</p>
            <p>Changed your mind?</p>
            <a href="${process.env.CLIENT_URL}" class="button">
              Return to Website
            </a>
            <div class="footer">
              <p>Thank you for being part of our community.</p>
            </div>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error occurred');
    next(error);
  }
});

// Protected routes
router.use(protect);

router.route('/')
  .get(getSubscribers)
  .post(createSubscriber);

router.delete('/:id', deleteSubscriber);
router.post('/import', importSubscribers);
router.get('/export', exportSubscribers);
router.post('/bulk-delete', bulkDeleteSubscribers);

export default router;
