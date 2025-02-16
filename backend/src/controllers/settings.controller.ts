import { Request, Response, NextFunction } from 'express';
import Settings from '../models/Settings';
import { APIError } from '../utils/errors';
import { logger } from '../utils/logger';
import { MailchimpService } from '../services/Integrations/mailchimp';

export class SettingsController {
  private mailchimpService: MailchimpService | null = null;

  async initializeMailchimp(apiKey: string, serverPrefix: string) {
    this.mailchimpService = new MailchimpService(apiKey, serverPrefix);
    await this.mailchimpService.initializeList();
  }

  getSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await Settings.findOne({ userId: req.user._id });
      if (!settings) {
        return res.json({
          status: 'success',
          data: {
            email: { fromName: '', replyTo: '' },
            mailchimp: { apiKey: '', serverPrefix: '', enabled: false },
            substack: { apiKey: '', publication: '', enabled: false }
          }
        });
      }
      res.json({ status: 'success', data: settings });
    } catch (error) {
      logger.error('Error fetching settings:', error);
      next(error);
    }
  }

  updateSettings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, mailchimp, substack } = req.body;

      if (!email?.fromName || !email?.replyTo) {
        throw new APIError(400, 'Email name and reply-to address are required');
      }

      const settings = await Settings.findOneAndUpdate(
        { userId: req.user._id },
        { email, mailchimp, substack },
        { new: true, upsert: true, runValidators: true }
      );

      if (mailchimp.enabled && mailchimp.apiKey) {
        await this.initializeMailchimp(mailchimp.apiKey, mailchimp.serverPrefix);
      }

      res.json({ status: 'success', data: settings });
    } catch (error) {
      logger.error('Error updating settings:', error);
      next(error);
    }
  }

  sendNewsletter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subject, content } = req.body;
      const settings = await Settings.findOne({ userId: req.user._id });

      if (!settings?.mailchimp?.enabled) {
        throw new APIError(400, 'Mailchimp is not enabled');
      }

      if (!this.mailchimpService) {
        await this.initializeMailchimp(settings.mailchimp.apiKey, settings.mailchimp.serverPrefix);
      }

      const result = await this.mailchimpService!.sendNewsletter({ subject, content });
      res.json({ status: 'success', data: result });
    } catch (error) {
      logger.error('Error sending newsletter:', error);
      next(error);
    }
  }

  scheduleNewsletter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { campaignId, sendTime } = req.body;
      const settings = await Settings.findOne({ userId: req.user._id });

      if (!settings?.mailchimp?.enabled) {
        throw new APIError(400, 'Mailchimp is not enabled');
      }

      if (!this.mailchimpService) {
        await this.initializeMailchimp(settings.mailchimp.apiKey, settings.mailchimp.serverPrefix);
      }

      const result = await this.mailchimpService!.scheduleNewsletter(campaignId, new Date(sendTime));
      res.json({ status: 'success', data: result });
    } catch (error) {
      logger.error('Error scheduling newsletter:', error);
      next(error);
    }
  }

  getSubscriberStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const settings = await Settings.findOne({ userId: req.user._id });

      if (!settings?.mailchimp?.enabled) {
        throw new APIError(400, 'Mailchimp is not enabled');
      }

      if (!this.mailchimpService) {
        await this.initializeMailchimp(settings.mailchimp.apiKey, settings.mailchimp.serverPrefix);
      }

      const stats = await this.mailchimpService!.getSubscriberStats();
      res.json({ status: 'success', data: stats });
    } catch (error) {
      logger.error('Error getting subscriber stats:', error);
      next(error);
    }
  }

  getCampaignStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { campaignId } = req.params;
      const settings = await Settings.findOne({ userId: req.user._id });

      if (!settings?.mailchimp?.enabled) {
        throw new APIError(400, 'Mailchimp is not enabled');
      }

      if (!this.mailchimpService) {
        await this.initializeMailchimp(settings.mailchimp.apiKey, settings.mailchimp.serverPrefix);
      }

      const stats = await this.mailchimpService!.getCampaignStats(campaignId);
      res.json({ status: 'success', data: stats });
    } catch (error) {
      logger.error('Error getting campaign stats:', error);
      next(error);
    }
  }
}

export const settingsController = new SettingsController();