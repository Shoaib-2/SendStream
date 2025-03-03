// backend/src/controllers/email.controller.ts
import { Request, Response, NextFunction } from 'express';
import { emailService } from '../services/email.service';
import Newsletter from '../models/Newsletter';
import { APIError } from '../utils/errors';
import { logger } from '../utils/logger';
import  Subscriber  from '../models/Subscriber';
import Settings from '../models/Settings';

/**
 * Controller class for handling email-related operations
 */
export class EmailController {
  /**
   * Send newsletter to subscribers
   */
  async sendNewsletter(req: Request, res: Response, next: NextFunction) {
    try {
      const { newsletterId } = req.params;
      const newsletter = await Newsletter.findById(newsletterId);
      
      if (!newsletter) {
        throw new APIError(404, 'Newsletter not found');
      }

      const subscribers = await Subscriber.find({ status: 'active' });
      const userSettingsPromises = subscribers.map(subscriber => 
        Settings.findOne({ userId: subscriber._id })
      );
      const userSettings = await Promise.all(userSettingsPromises);
      await emailService.sendNewsletter(newsletter, subscribers, userSettings.filter(Boolean));

      res.status(200).json({
        status: 'success',
        message: `Newsletter sent to ${subscribers.length} subscribers`
      });
    } catch (error) {
      logger.error('Error in sendNewsletter:', error);
      next(error);
    }
  }

}

export const emailController = new EmailController();