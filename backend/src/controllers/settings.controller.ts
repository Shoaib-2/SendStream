import { Request, Response, NextFunction } from 'express';
import { settingsService } from '../services/settings.service';
import { logger } from '../utils/logger';
import { cacheService, CacheKeys } from '../services/cache.service';

export class SettingsController {
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?._id) return next(new Error('Authentication required'));
      
      // Use cache for settings
      const cacheKey = CacheKeys.userSettings(req.user._id);
      const settings = await cacheService.getOrSet(
        cacheKey,
        async () => await settingsService.getSettings(req.user._id),
        5 * 60 * 1000 // Cache for 5 minutes
      );
      
      res.json({ status: 'success', data: settings });
    } catch (error) {
      logger.error('Error fetching settings:', error);
      return next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?._id) return next(new Error('Authentication required'));
      
      const { email, mailchimp } = req.body;
      const settings = await settingsService.updateSettings(req.user._id, email, mailchimp);
      
      // Invalidate settings cache
      cacheService.delete(CacheKeys.userSettings(req.user._id));
      
      res.json({ status: 'success', data: settings });
    } catch (error) {
      logger.error('Error updating settings:', error);
      return next(error);
    }
  }

  async testIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?._id) return next(new Error('Authentication required'));
      
      const { type } = req.params;
      
      if (type !== 'mailchimp') {
        return res.status(400).json({
          status: 'error',
          data: {
            success: false,
            message: 'Invalid integration type'
          }
        });
      }
      
      const { apiKey, serverPrefix } = req.body;
      const result = await settingsService.testMailchimpIntegration(req.user._id, apiKey, serverPrefix);
      
      return res.json({ 
        status: 'success', 
        data: result
      });
    } catch (error: any) {
      logger.error('Integration test error:', error);
      return next(error);
    }
  }
  
  async enableIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?._id) return next(new Error('Authentication required'));
      
      const { enabled, autoSync } = req.body;
      const result = await settingsService.toggleMailchimpIntegration(req.user._id, enabled, autoSync);
      
      // Invalidate settings cache
      cacheService.delete(CacheKeys.userSettings(req.user._id));
      
      return res.json({
        status: 'success',
        data: result
      });
    } catch (error) {
      logger.error('Error enabling integration:', error);
      return next(error);
    }
  }

  async sendNewsletter(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?._id) return next(new Error('Authentication required'));
      
      const { subject, content } = req.body;
      const result = await settingsService.sendMailchimpNewsletter(req.user._id, subject, content);
      
      res.json({ status: 'success', data: result });
    } catch (error) {
      logger.error('Error sending newsletter:', error);
      next(error);
    }
  }

  async scheduleNewsletter(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?._id) return next(new Error('Authentication required'));
      
      const { campaignId, sendTime } = req.body;
      const result = await settingsService.scheduleMailchimpNewsletter(
        req.user._id,
        campaignId,
        new Date(sendTime)
      );
      
      res.json({ status: 'success', data: result });
    } catch (error) {
      logger.error('Error scheduling newsletter:', error);
      next(error);
    }
  }

  async getSubscriberStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?._id) return next(new Error('Authentication required'));
      
      const stats = await settingsService.getMailchimpSubscriberStats(req.user._id);
      res.json({ status: 'success', data: stats });
    } catch (error) {
      logger.error('Error getting subscriber stats:', error);
      next(error);
    }
  }

  async syncSubscribers(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?._id) return next(new Error('Authentication required'));
      
      const subscribers = await settingsService.syncMailchimpSubscribers(req.user._id);
      res.json({ status: 'success', data: subscribers });
    } catch (error) {
      logger.error('Error syncing subscribers:', error);
      next(error);
    }
  }

  async getCampaignStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?._id) return next(new Error('Authentication required'));
      
      const { campaignId } = req.params;
      const stats = await settingsService.getMailchimpCampaignStats(req.user._id, campaignId);
      
      res.json({ status: 'success', data: stats });
    } catch (error) {
      logger.error('Error getting campaign stats:', error);
      next(error);
    }
  }
}

export const settingsController = new SettingsController();