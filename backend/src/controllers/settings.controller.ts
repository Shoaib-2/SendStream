import { Request, Response, NextFunction } from 'express';
import Settings from '../models/Settings';
import { APIError } from '../utils/errors';
import { logger } from '../utils/logger';
import { MailchimpService } from '../services/Integrations/mailchimp';

export class SettingsController {
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await Settings.findOne({ userId: req.user._id });
      if (!settings) {
        return res.json({
          status: 'success',
          data: {
          email: { fromName: '', replyTo: '', senderEmail: '' },
            mailchimp: { 
              apiKey: '', 
              serverPrefix: '', 
              enabled: false,
              autoSync: false 
            },
          }
        });
      }
      
      // Hide full API key when returning settings
      const sanitizedSettings = {
        ...settings.toObject(),
        mailchimp: {
          ...(settings.mailchimp || {}),
          apiKey: settings.mailchimp?.apiKey ? '••••••••' + settings.mailchimp.apiKey.slice(-4) : '',
        }
      };
      
      res.json({ status: 'success', data: sanitizedSettings });
    } catch (error) {
      logger.error('Error fetching settings:', error);
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, mailchimp } = req.body;

      // Get existing settings to check if API key is masked
      const existingSettings = await Settings.findOne({ userId: req.user._id });
      const updatedMailchimp = { ...(existingSettings?.mailchimp || {}), ...(mailchimp || {}) };
      
      // If API key is masked and existing key exists, keep the existing key
      if (updatedMailchimp.apiKey?.startsWith('••••••••') && existingSettings?.mailchimp?.apiKey) {
        updatedMailchimp.apiKey = existingSettings.mailchimp.apiKey;
      }

      // Create default email if not provided
      const updatedEmail = {
        ...(existingSettings?.email || { fromName: '', replyTo: '', senderEmail: '' }),
        ...(email || {})
      };

      const settings = await Settings.findOneAndUpdate(
        { userId: req.user._id },
        { 
          email: updatedEmail,
          mailchimp: updatedMailchimp 
        },
        { new: true, upsert: true, runValidators: true }
      );

      // Return response with masked API key
      const sanitizedSettings = {
        ...settings.toObject(),
        mailchimp: {
          ...(settings.mailchimp || {}),
          apiKey: settings.mailchimp?.apiKey ? '••••••••' + settings.mailchimp.apiKey.slice(-4) : '',
        }
      };
      
      res.json({ status: 'success', data: sanitizedSettings });
    } catch (error) {
      logger.error('Error updating settings:', error);
      next(error);
    }
  }

  async testIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.params;
      const settings = await Settings.findOne({ userId: req.user._id });
      
      if (!settings) {
        throw new APIError(404, 'Settings not found');
      }
      
      if (type === 'mailchimp') {
        if (!settings.mailchimp?.apiKey || !settings.mailchimp?.serverPrefix) {
          return res.status(400).json({
            status: 'error',
            data: {
              success: false,
              message: 'Mailchimp API key and server prefix are required'
            }
          });
        }
        
        // Create service instance for this test
        const mailchimpService = new MailchimpService(
          settings.mailchimp.apiKey,
          settings.mailchimp.serverPrefix
        );
        
        const result = await mailchimpService.testConnection();
        
        // Store listId if test was successful
        if (result.success && result.listId) {
          const updatedMailchimp = { ...(settings.mailchimp || {}) };
          updatedMailchimp.listId = result.listId;
          
          settings.mailchimp = updatedMailchimp;
          await settings.save();
        }
        
        return res.json({ 
          status: 'success', 
          data: result
        });
      } else {
        return res.status(400).json({
          status: 'error',
          data: {
            success: false,
            message: 'Invalid integration type'
          }
        });
      }
    } catch (error: any) {
      logger.error('Integration test error:', error);
      return res.status(error.status || 500).json({
        status: 'error',
        data: {
          success: false,
          message: error.message || 'Integration test failed'
        }
      });
    }
  }

  async enableIntegration(req: Request, res: Response, next: NextFunction) {
    try {
      const { type } = req.params;
      const { enabled, autoSync } = req.body;
      
      if (type !== 'mailchimp') {
        throw new APIError(400, 'Invalid integration type');
      }
      
      const settings = await Settings.findOne({ userId: req.user._id });
      
      if (!settings) {
        throw new APIError(404, 'Settings not found');
      }
      
      // Only test connection if trying to enable
      if (enabled && (!settings.mailchimp?.apiKey || !settings.mailchimp?.serverPrefix)) {
        throw new APIError(400, 'Mailchimp API key and server prefix are required');
      }
      
      // Initialize mailchimp object if it doesn't exist
      if (!settings.mailchimp) {
        settings.mailchimp = {
          apiKey: '',
          serverPrefix: '',
          enabled: false,
          autoSync: false
        };
      }
      
      if (enabled) {
        // Test connection before enabling
        const mailchimpService = new MailchimpService(
          settings.mailchimp.apiKey,
          settings.mailchimp.serverPrefix
        );
        
        const result = await mailchimpService.testConnection();
        
        if (!result.success) {
          throw new APIError(400, 'Connection test failed: ' + result.message);
        }
        
        if (result.listId) {
          settings.mailchimp.listId = result.listId;
        }
      }
      
      // Update enabled status
      settings.mailchimp.enabled = enabled;
      
      // Update autoSync if provided
      if (autoSync !== undefined) {
        settings.mailchimp.autoSync = autoSync;
      }
      
      await settings.save();
      
      return res.json({
        status: 'success',
        data: {
          enabled: settings.mailchimp.enabled,
          autoSync: settings.mailchimp.autoSync
        }
      });
    } catch (error) {
      logger.error('Error enabling integration:', error);
      next(error);
    }
  }

  async sendNewsletter(req: Request, res: Response, next: NextFunction) {
    try {
      const { subject, content } = req.body;
      const settings = await Settings.findOne({ userId: req.user._id });

      if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
        throw new APIError(400, 'Mailchimp is not enabled or configured');
      }

      // Create service instance for this user
      const mailchimpService = new MailchimpService(
        settings.mailchimp.apiKey,
        settings.mailchimp.serverPrefix
      );
      
      // Initialize list
      await mailchimpService.initializeList();
      
      // Send newsletter
      const result = await mailchimpService.sendNewsletter({ subject, content });
      res.json({ status: 'success', data: result });
    } catch (error) {
      logger.error('Error sending newsletter:', error);
      next(error);
    }
  }

  async scheduleNewsletter(req: Request, res: Response, next: NextFunction) {
    try {
      const { campaignId, sendTime } = req.body;
      const settings = await Settings.findOne({ userId: req.user._id });

      if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
        throw new APIError(400, 'Mailchimp is not enabled or configured');
      }

      // Create service instance for this user
      const mailchimpService = new MailchimpService(
        settings.mailchimp.apiKey,
        settings.mailchimp.serverPrefix
      );
      
      // Initialize list
      await mailchimpService.initializeList();
      
      // Schedule newsletter
      const result = await mailchimpService.scheduleNewsletter(campaignId, new Date(sendTime));
      res.json({ status: 'success', data: result });
    } catch (error) {
      logger.error('Error scheduling newsletter:', error);
      next(error);
    }
  }

  async getSubscriberStats(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await Settings.findOne({ userId: req.user._id });

      if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
        throw new APIError(400, 'Mailchimp is not enabled or configured');
      }

      // Create service instance for this user
      const mailchimpService = new MailchimpService(
        settings.mailchimp.apiKey,
        settings.mailchimp.serverPrefix
      );
      
      // Initialize list
      await mailchimpService.initializeList();
      
      // Get subscriber stats
      const stats = await mailchimpService.getSubscriberStats();
      res.json({ status: 'success', data: stats });
    } catch (error) {
      logger.error('Error getting subscriber stats:', error);
      next(error);
    }
  }

  async syncSubscribers(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await Settings.findOne({ userId: req.user._id });

      if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
        throw new APIError(400, 'Mailchimp is not enabled or configured');
      }

      // Create service instance for this user
      const mailchimpService = new MailchimpService(
        settings.mailchimp.apiKey,
        settings.mailchimp.serverPrefix
      );
      
      // Initialize list
      await mailchimpService.initializeList();
      
      // Sync subscribers
      const subscribers = await mailchimpService.syncSubscribers();
      res.json({ status: 'success', data: subscribers });
    } catch (error) {
      logger.error('Error syncing subscribers:', error);
      next(error);
    }
  }

  async getCampaignStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { campaignId } = req.params;
      const settings = await Settings.findOne({ userId: req.user._id });

      if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
        throw new APIError(400, 'Mailchimp is not enabled or configured');
      }

      // Create service instance for this user
      const mailchimpService = new MailchimpService(
        settings.mailchimp.apiKey,
        settings.mailchimp.serverPrefix
      );
      
      // Initialize list
      await mailchimpService.initializeList();
      
      // Get campaign stats
      const stats = await mailchimpService.getCampaignStats(campaignId);
      res.json({ status: 'success', data: stats });
    } catch (error) {
      logger.error('Error getting campaign stats:', error);
      next(error);
    }
  }
}

export const settingsController = new SettingsController();