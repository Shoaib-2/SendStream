import Settings from '../models/Settings';
import { Types } from 'mongoose';

/**
 * SettingsRepository - Data access layer for Settings model
 * Abstracts all database operations for user settings
 */
export class SettingsRepository {
  /**
   * Create new settings for a user
   */
  async create(settingsData: {
    userId: string | Types.ObjectId;
    email: {
      fromName: string;
      replyTo: string;
      senderEmail: string;
    };
    mailchimp?: {
      apiKey?: string;
      serverPrefix?: string;
      enabled?: boolean;
      listId?: string;
      autoSync?: boolean;
    };
  }) {
    return await Settings.create(settingsData);
  }

  /**
   * Find settings by user ID
   */
  async findByUserId(userId: string | Types.ObjectId) {
    return await Settings.findOne({ userId });
  }

  /**
   * Find settings by user ID with population
   */
  async findByUserIdWithUser(userId: string | Types.ObjectId) {
    return await Settings.findOne({ userId }).populate('userId', 'email');
  }

  /**
   * Update settings by user ID
   */
  async updateByUserId(
    userId: string | Types.ObjectId,
    updateData: Record<string, any>
  ) {
    return await Settings.findOneAndUpdate(
      { userId },
      updateData,
      { new: true, runValidators: true }
    );
  }

  /**
   * Upsert settings (create if doesn't exist, update if exists)
   */
  async upsert(
    userId: string | Types.ObjectId,
    settingsData: Record<string, any>
  ) {
    return await Settings.findOneAndUpdate(
      { userId },
      settingsData,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );
  }

  /**
   * Update email settings
   */
  async updateEmailSettings(
    userId: string | Types.ObjectId,
    emailSettings: {
      fromName?: string;
      replyTo?: string;
      senderEmail?: string;
    }
  ) {
    const updateData: any = {};
    if (emailSettings.fromName) updateData['email.fromName'] = emailSettings.fromName;
    if (emailSettings.replyTo) updateData['email.replyTo'] = emailSettings.replyTo;
    if (emailSettings.senderEmail) updateData['email.senderEmail'] = emailSettings.senderEmail;

    return await Settings.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  /**
   * Update Mailchimp settings
   */
  async updateMailchimpSettings(
    userId: string | Types.ObjectId,
    mailchimpSettings: {
      apiKey?: string;
      serverPrefix?: string;
      enabled?: boolean;
      listId?: string;
      autoSync?: boolean;
    }
  ) {
    const updateData: any = {};
    if (mailchimpSettings.apiKey !== undefined) {
      updateData['mailchimp.apiKey'] = mailchimpSettings.apiKey;
    }
    if (mailchimpSettings.serverPrefix !== undefined) {
      updateData['mailchimp.serverPrefix'] = mailchimpSettings.serverPrefix;
    }
    if (mailchimpSettings.enabled !== undefined) {
      updateData['mailchimp.enabled'] = mailchimpSettings.enabled;
    }
    if (mailchimpSettings.listId !== undefined) {
      updateData['mailchimp.listId'] = mailchimpSettings.listId;
    }
    if (mailchimpSettings.autoSync !== undefined) {
      updateData['mailchimp.autoSync'] = mailchimpSettings.autoSync;
    }

    return await Settings.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );
  }

  /**
   * Enable/disable Mailchimp integration
   */
  async toggleMailchimp(
    userId: string | Types.ObjectId,
    enabled: boolean
  ) {
    return await Settings.findOneAndUpdate(
      { userId },
      { $set: { 'mailchimp.enabled': enabled } },
      { new: true }
    );
  }

  /**
   * Update Mailchimp list ID
   */
  async updateMailchimpListId(
    userId: string | Types.ObjectId,
    listId: string
  ) {
    return await Settings.findOneAndUpdate(
      { userId },
      { $set: { 'mailchimp.listId': listId } },
      { new: true }
    );
  }

  /**
   * Delete settings by user ID
   */
  async deleteByUserId(userId: string | Types.ObjectId) {
    return await Settings.findOneAndDelete({ userId });
  }

  /**
   * Check if settings exist for user
   */
  async exists(userId: string | Types.ObjectId): Promise<boolean> {
    const count = await Settings.countDocuments({ userId });
    return count > 0;
  }

  /**
   * Get all settings (admin function)
   */
  async findAll() {
    return await Settings.find().populate('userId', 'email');
  }

  /**
   * Count total settings
   */
  async count(): Promise<number> {
    return await Settings.countDocuments();
  }

  /**
   * Find settings with Mailchimp enabled
   */
  async findWithMailchimpEnabled() {
    return await Settings.find({
      'mailchimp.enabled': true
    }).populate('userId', 'email');
  }

  /**
   * Find settings with auto-sync enabled
   */
  async findWithAutoSyncEnabled() {
    return await Settings.find({
      'mailchimp.enabled': true,
      'mailchimp.autoSync': true
    }).populate('userId', 'email');
  }

  /**
   * Get Mailchimp credentials for user
   */
  async getMailchimpCredentials(userId: string | Types.ObjectId) {
    const settings = await Settings.findOne({ userId });
    if (!settings || !settings.mailchimp) {
      return null;
    }

    return {
      apiKey: settings.mailchimp.apiKey,
      serverPrefix: settings.mailchimp.serverPrefix,
      listId: settings.mailchimp.listId,
      enabled: settings.mailchimp.enabled,
      autoSync: settings.mailchimp.autoSync
    };
  }

  /**
   * Initialize default settings for new user
   */
  async initializeForUser(
    userId: string | Types.ObjectId,
    email: string
  ) {
    return await this.create({
      userId,
      email: {
        fromName: 'Newsletter',
        replyTo: email,
        senderEmail: email
      }
    });
  }

  /**
   * Validate Mailchimp configuration
   */
  async hasValidMailchimpConfig(userId: string | Types.ObjectId): Promise<boolean> {
    const settings = await Settings.findOne({ userId });
    
    return !!(
      settings?.mailchimp?.enabled &&
      settings.mailchimp.apiKey &&
      settings.mailchimp.serverPrefix
    );
  }

  /**
   * Get email configuration for user
   */
  async getEmailConfig(userId: string | Types.ObjectId) {
    const settings = await Settings.findOne({ userId });
    return settings?.email || null;
  }
}

export const settingsRepository = new SettingsRepository();
