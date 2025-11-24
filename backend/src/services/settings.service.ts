import Settings from '../models/Settings';
import { ValidationError, NotFoundError } from '../utils/customErrors';
import { logger } from '../utils/logger';
import { MailchimpService } from './Integrations/mailchimp';

interface EmailSettings {
  fromName: string;
  replyTo: string;
  senderEmail: string;
}

interface MailchimpSettings {
  apiKey: string;
  serverPrefix: string;
  enabled: boolean;
  autoSync: boolean;
  listId?: string;
}

export class SettingsService {
  /**
   * Get user settings
   */
  async getSettings(userId: string): Promise<any> {
    const settings = await Settings.findOne({ userId });
    
    if (!settings) {
      return {
        email: { fromName: '', replyTo: '', senderEmail: '' },
        mailchimp: { 
          apiKey: '', 
          serverPrefix: '', 
          enabled: false,
          autoSync: false 
        },
      };
    }
    
    // Hide full API key when returning settings
    const sanitizedSettings = {
      ...settings.toObject(),
      mailchimp: {
        ...(settings.mailchimp || {}),
        apiKey: settings.mailchimp?.apiKey ? '••••••••' + settings.mailchimp.apiKey.slice(-4) : '',
      }
    };
    
    return sanitizedSettings;
  }

  /**
   * Update user settings
   */
  async updateSettings(userId: string, email?: Partial<EmailSettings>, mailchimp?: Partial<MailchimpSettings>): Promise<any> {
    const existingSettings = await Settings.findOne({ userId });
    const updatedMailchimp = { ...(existingSettings?.mailchimp || {}), ...(mailchimp || {}) };
    
    // If API key is masked and existing key exists, keep the existing key
    if (updatedMailchimp.apiKey?.startsWith('••••••••') && existingSettings?.mailchimp?.apiKey) {
      updatedMailchimp.apiKey = existingSettings.mailchimp.apiKey;
    }

    const updatedEmail = {
      ...(existingSettings?.email || { fromName: '', replyTo: '', senderEmail: '' }),
      ...(email || {})
    };

    const settings = await Settings.findOneAndUpdate(
      { userId },
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
    
    return sanitizedSettings;
  }

  /**
   * Test Mailchimp integration
   */
  async testMailchimpIntegration(userId: string, apiKey?: string, serverPrefix?: string): Promise<any> {
    let settings = await Settings.findOne({ userId });
    
    if (!settings) {
      logger.info('Creating default settings for user');
      settings = new Settings({
        userId,
        email: { fromName: '', replyTo: '', senderEmail: '' },
        mailchimp: {
          apiKey: '',
          serverPrefix: '',
          enabled: false,
          autoSync: false
        }
      });
      
      await settings.save();
    }
    
    if (!settings.mailchimp) {
      settings.mailchimp = {
        apiKey: '',
        serverPrefix: '',
        enabled: false,
        autoSync: false
      };
      await settings.save();
    }
    
    const mailchimpApiKey = apiKey || settings.mailchimp.apiKey || '';
    const mailchimpServerPrefix = serverPrefix || settings.mailchimp.serverPrefix || '';
    
    if (!mailchimpApiKey || !mailchimpServerPrefix) {
      throw new ValidationError('Mailchimp API key and server prefix are required');
    }
    
    logger.info('Testing Mailchimp with provided credentials');
    
    const mailchimpService = new MailchimpService(
      mailchimpApiKey,
      mailchimpServerPrefix
    );
    
    const result = await mailchimpService.testConnection();
    
    // If test successful and using new credentials, update settings
    if (result.success && (apiKey || serverPrefix)) {
      if (apiKey) settings.mailchimp.apiKey = apiKey;
      if (serverPrefix) settings.mailchimp.serverPrefix = serverPrefix;
      
      if (result.listId) {
        settings.mailchimp.listId = result.listId;
      }
      
      await settings.save();
      logger.info('Updated settings with new credentials after successful test');
    }
    
    return result;
  }

  /**
   * Enable or disable Mailchimp integration
   */
  async toggleMailchimpIntegration(userId: string, enabled: boolean, autoSync?: boolean): Promise<{ enabled: boolean; autoSync: boolean }> {
    const settings = await Settings.findOne({ userId });
    
    if (!settings) {
      throw new NotFoundError('Settings not found');
    }
    
    if (enabled && (!settings.mailchimp?.apiKey || !settings.mailchimp?.serverPrefix)) {
      throw new ValidationError('Mailchimp API key and server prefix are required');
    }
    
    if (!settings.mailchimp) {
      settings.mailchimp = {
        apiKey: '',
        serverPrefix: '',
        enabled: false,
        autoSync: false
      };
    }
    
    if (enabled) {
      const mailchimpService = new MailchimpService(
        settings.mailchimp.apiKey,
        settings.mailchimp.serverPrefix
      );
      
      const result = await mailchimpService.testConnection();
      
      if (!result.success) {
        throw new ValidationError('Connection test failed: ' + result.message);
      }
      
      if (result.listId) {
        settings.mailchimp.listId = result.listId;
      }
    }
    
    settings.mailchimp.enabled = enabled;
    
    if (autoSync !== undefined) {
      settings.mailchimp.autoSync = autoSync;
    }
    
    await settings.save();
    
    return {
      enabled: settings.mailchimp.enabled,
      autoSync: settings.mailchimp.autoSync
    };
  }

  /**
   * Send newsletter via Mailchimp
   */
  async sendMailchimpNewsletter(userId: string, subject: string, content: string): Promise<any> {
    const settings = await Settings.findOne({ userId });

    if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
      throw new ValidationError('Mailchimp is not enabled or configured');
    }

    const mailchimpService = new MailchimpService(
      settings.mailchimp.apiKey,
      settings.mailchimp.serverPrefix
    );
    
    await mailchimpService.initializeList();
    
    const result = await mailchimpService.sendNewsletter({ subject, content });
    return result;
  }

  /**
   * Schedule newsletter via Mailchimp
   */
  async scheduleMailchimpNewsletter(userId: string, campaignId: string, sendTime: Date): Promise<any> {
    const settings = await Settings.findOne({ userId });

    if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
      throw new ValidationError('Mailchimp is not enabled or configured');
    }

    const mailchimpService = new MailchimpService(
      settings.mailchimp.apiKey,
      settings.mailchimp.serverPrefix
    );
    
    await mailchimpService.initializeList();
    
    const result = await mailchimpService.scheduleNewsletter(campaignId, sendTime);
    return result;
  }

  /**
   * Get Mailchimp subscriber stats
   */
  async getMailchimpSubscriberStats(userId: string): Promise<any> {
    const settings = await Settings.findOne({ userId });

    if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
      throw new ValidationError('Mailchimp is not enabled or configured');
    }

    const mailchimpService = new MailchimpService(
      settings.mailchimp.apiKey,
      settings.mailchimp.serverPrefix
    );
    
    await mailchimpService.initializeList();
    
    const stats = await mailchimpService.getSubscriberStats();
    return stats;
  }

  /**
   * Sync Mailchimp subscribers
   */
  async syncMailchimpSubscribers(userId: string): Promise<any> {
    const settings = await Settings.findOne({ userId });

    if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
      throw new ValidationError('Mailchimp is not enabled or configured');
    }

    const mailchimpService = new MailchimpService(
      settings.mailchimp.apiKey,
      settings.mailchimp.serverPrefix
    );
    
    await mailchimpService.initializeList();
    
    const subscribers = await mailchimpService.syncSubscribers();
    return subscribers;
  }

  /**
   * Get Mailchimp campaign stats
   */
  async getMailchimpCampaignStats(userId: string, campaignId: string): Promise<any> {
    const settings = await Settings.findOne({ userId });

    if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
      throw new ValidationError('Mailchimp is not enabled or configured');
    }

    const mailchimpService = new MailchimpService(
      settings.mailchimp.apiKey,
      settings.mailchimp.serverPrefix
    );
    
    await mailchimpService.initializeList();
    
    const stats = await mailchimpService.getCampaignStats(campaignId);
    return stats;
  }
}

export const settingsService = new SettingsService();
