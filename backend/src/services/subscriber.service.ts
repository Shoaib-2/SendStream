import Subscriber from '../models/Subscriber';
import Settings from '../models/Settings';
import { ValidationError, NotFoundError } from '../utils/customErrors';
import { logger } from '../utils/logger';
import { MailchimpService } from './Integrations/mailchimp';
import Papa from 'papaparse';
import mongoose from 'mongoose';

/**
 * Helper to get decrypted Mailchimp API key from settings
 * Returns null if decryption fails (non-blocking) instead of throwing
 */
function getDecryptedMailchimpKey(settings: any): string | null {
  if (!settings.mailchimp?.apiKey) {
    logger.warn('Mailchimp API key not found in settings');
    return null;
  }
  
  try {
    const decryptedKey = settings.getDecryptedMailchimpApiKey();
    if (!decryptedKey) {
      logger.warn('Mailchimp API key exists but decryption returned undefined');
      logger.warn('This may indicate the encryption key changed between environments');
      logger.warn('Mailchimp sync will be skipped - please re-enter your API key in settings');
      return null;
    }
    return decryptedKey;
  } catch (error) {
    logger.error('Failed to decrypt Mailchimp API key:', error);
    logger.warn('Mailchimp sync will be skipped - please re-enter your API key in settings');
    return null;
  }
}

interface MailchimpSubscriber {
  email: string;
  name: string;
  status: string;
  subscribedDate: string;
}

export class SubscriberService {
  /**
   * Sync Mailchimp subscribers with local database
   */
  async syncMailchimpSubscribers(userId: string): Promise<MailchimpSubscriber[]> {
    const settings = await Settings.findOne({ userId });
    
    if (!settings?.mailchimp?.enabled) {
      return [];
    }

    const decryptedApiKey = getDecryptedMailchimpKey(settings);
    
    // If decryption failed, skip Mailchimp sync gracefully
    if (!decryptedApiKey) {
      logger.warn(`Skipping Mailchimp sync for user ${userId} due to API key decryption failure`);
      return [];
    }
    
    const mailchimpService = new MailchimpService(
      decryptedApiKey,
      settings.mailchimp.serverPrefix.trim()
    );
    
    await mailchimpService.initializeList();
    const mailchimpSubscribers = await mailchimpService.syncSubscribers();
    
    const localSubscribers = await Subscriber.find({ createdBy: userId });
    
    const localSubscribersByEmail = new Map();
    localSubscribers.forEach(sub => {
      localSubscribersByEmail.set(sub.email.toLowerCase(), {
        id: sub._id.toString(),
        status: sub.status
      });
    });
    
    const mailchimpUpdates = [];
    const operations = [];
    
    for (const mcSub of mailchimpSubscribers) {
      const email = mcSub.email.toLowerCase();
      const localSub = localSubscribersByEmail.get(email);
      
      if (localSub) {
        if (localSub.status === 'unsubscribed' && mcSub.status === 'active') {
          mailchimpUpdates.push({
            email: mcSub.email,
            status: 'unsubscribed'
          });
          
          logger.info(`Detected status mismatch for ${email}: Local=unsubscribed, Mailchimp=active`);
          continue;
        }
        
        if (localSub.status === 'active' && mcSub.status === 'unsubscribed') {
          operations.push({
            updateOne: {
              filter: { email: mcSub.email, createdBy: userId },
              update: {
                $set: {
                  status: 'unsubscribed',
                  name: mcSub.name,
                  subscribed: mcSub.subscribedDate,
                  source: 'mailchimp'
                }
              }
            }
          });
        }
      } else {
        operations.push({
          updateOne: {
            filter: { email: mcSub.email, createdBy: userId },
            update: {
              $set: {
                name: mcSub.name,
                status: mcSub.status,
                subscribed: mcSub.subscribedDate,
                source: 'mailchimp'
              }
            },
            upsert: true
          }
        });
      }
    }

    if (operations.length > 0) {
      await Subscriber.bulkWrite(operations);
    }
    
    if (mailchimpUpdates.length > 0) {
      try {
        logger.info(`Updating ${mailchimpUpdates.length} subscribers in Mailchimp to unsubscribed`);
        for (const update of mailchimpUpdates) {
          await mailchimpService.updateSubscriberStatus(update.email, 'unsubscribed');
        }
      } catch (error) {
        logger.error('Error updating subscribers in Mailchimp:', error);
      }
    }
    
    return mailchimpSubscribers;
  }

  /**
   * Get all subscribers for user
   */
  async getAllSubscribers(userId: string): Promise<any[]> {
    logger.info(`[getAllSubscribers] Starting for user ${userId}`);
    
    try {
      await this.syncMailchimpSubscribers(userId);
      logger.info(`[getAllSubscribers] Mailchimp sync completed for user ${userId}`);
    } catch (error) {
      logger.error('Error syncing Mailchimp subscribers:', error);
      logger.info(`[getAllSubscribers] Continuing after Mailchimp sync error for user ${userId}`);
    }
     
    logger.info(`[getAllSubscribers] Fetching subscribers from database for user ${userId}`);
    const subscribers = await Subscriber.find({ createdBy: userId })
      .select('-__v')
      .populate('createdBy', 'email');

    logger.info(`[getAllSubscribers] Found ${subscribers.length} subscribers for user ${userId}`);
    
    return subscribers.map(sub => ({
      id: sub._id.toString(),
      email: sub.email,
      name: sub.name,
      status: sub.status,
      subscribed: sub.subscribed,
      createdBy: sub.createdBy,
      source: sub.source || 'manual'
    }));
  }

  /**
   * Create a new subscriber
   */
  async createSubscriber(email: string, name: string, userId: string): Promise<any> {
    const subscriber = await Subscriber.create({
      email,
      name,
      status: 'active',
      createdBy: userId,
      subscribed: new Date(),
      source: 'manual'
    });

    return subscriber;
  }

  /**
   * Update subscriber status (unsubscribe or reactivate)
   */
  async updateSubscriberStatus(subscriberId: string, status: 'active' | 'unsubscribed', userId: string): Promise<any> {
    const subscriber = await Subscriber.findById(subscriberId);

    if (!subscriber) {
      throw new NotFoundError('Subscriber not found');
    }

    subscriber.status = status;
    await subscriber.save();
    
    // Sync with Mailchimp if enabled
    try {
      const settings = await Settings.findOne({ userId });
      
      if (settings?.mailchimp?.enabled) {
        const decryptedApiKey = getDecryptedMailchimpKey(settings);
        if (decryptedApiKey) {
          const mailchimpService = new MailchimpService(
            decryptedApiKey,
            settings.mailchimp.serverPrefix.trim()
          );
          
          await mailchimpService.initializeList();
          const mailchimpStatus = status === 'active' ? 'subscribed' : 'unsubscribed';
          await mailchimpService.updateSubscriberStatus(subscriber.email, mailchimpStatus);
          logger.info(`Updated Mailchimp status for ${subscriber.email} to ${mailchimpStatus}`);
        }
      }
    } catch (mailchimpError) {
      logger.error(`Failed to update Mailchimp for ${subscriber.email}:`, mailchimpError);
    }

    return subscriber;
  }

  /**
   * Bulk update subscribers to unsubscribed status
   */
  async bulkUnsubscribe(ids: string[], userId: string): Promise<number> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ValidationError('Invalid subscriber IDs');
    }

    const validIds = ids.every(id => mongoose.Types.ObjectId.isValid(id));
    if (!validIds) {
      throw new ValidationError('Invalid subscriber ID format in the list');
    }

    const subscribers = await Subscriber.find({
      _id: { $in: ids },
      createdBy: userId
    });

    if (subscribers.length === 0) {
      return 0;
    }

    const result = await Subscriber.updateMany(
      { _id: { $in: ids }, createdBy: userId },
      { $set: { status: 'unsubscribed' } }
    );

    // Sync with Mailchimp if enabled
    try {
      const settings = await Settings.findOne({ userId });
      
      if (settings?.mailchimp?.enabled) {
        const decryptedApiKey = getDecryptedMailchimpKey(settings);
        if (decryptedApiKey) {
          const mailchimpService = new MailchimpService(
            decryptedApiKey,
            settings.mailchimp.serverPrefix.trim()
          );
          
          await mailchimpService.initializeList();
          
          for (const sub of subscribers) {
            await mailchimpService.updateSubscriberStatus(sub.email, 'unsubscribed');
          }
          
          logger.info(`Updated ${subscribers.length} subscribers in Mailchimp to unsubscribed`);
        }
      }
    } catch (mailchimpError) {
      logger.error('Failed to update Mailchimp for bulk unsubscribe:', mailchimpError);
    }

    return result.modifiedCount;
  }

  /**
   * Import subscribers from CSV data
   */
  async importSubscribers(csvData: string, userId: string): Promise<{ imported: number; subscribers: any[] }> {
    if (!csvData) {
      throw new ValidationError('CSV data is required');
    }

    const parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true
    });

    if (parsedData.errors.length > 0) {
      throw new ValidationError('CSV parsing error');
    }

    const subscribers = await Subscriber.create(
      parsedData.data.map((row) => ({
        ...row as Record<string, any>,
        createdBy: userId,
        status: 'active',
        source: 'csv'
      }))
    );

    return {
      imported: subscribers.length,
      subscribers
    };
  }

  /**
   * Export subscribers to CSV format
   */
  async exportSubscribers(userId: string): Promise<string> {
    const subscribers = await Subscriber.find({ createdBy: userId });

    const csvContent = [
      ['ID', 'Email', 'Name', 'Status', 'Subscribed Date', 'Source'],
      ...subscribers.map(sub => [
        sub._id.toString(),
        sub.email,
        sub.name,
        sub.status,
        sub.subscribed ? new Date(sub.subscribed).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }) : 'N/A',
        sub.source || 'manual'
      ])
    ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\r\n');

    return csvContent;
  }

  /**
   * Unsubscribe via token (from email link)
   */
  async unsubscribeByToken(token: string): Promise<{ success: boolean; subscriber?: any }> {
    try {
      const subscriberId = Buffer.from(token, 'base64').toString('utf-8');

      const subscriber = await Subscriber.findById(subscriberId);
      if (!subscriber) {
        return { success: false };
      }

      subscriber.status = 'unsubscribed';
      await subscriber.save();
      
      // Sync with Mailchimp if enabled
      try {
        const settings = await Settings.findOne({ userId: subscriber.createdBy });
        
        if (settings?.mailchimp?.enabled) {
          const decryptedApiKey = getDecryptedMailchimpKey(settings);
          if (decryptedApiKey) {
            const mailchimpService = new MailchimpService(
              decryptedApiKey,
              settings.mailchimp.serverPrefix.trim()
            );
            
            await mailchimpService.initializeList();
            await mailchimpService.updateSubscriberStatus(subscriber.email, 'unsubscribed');
            logger.info(`Updated Mailchimp status for ${subscriber.email} to unsubscribed via unsubscribe link`);
          }
        }
      } catch (mailchimpError) {
        logger.error(`Failed to update Mailchimp for ${subscriber.email} via unsubscribe link:`, mailchimpError);
      }

      return { success: true, subscriber };
    } catch (error) {
      logger.error('Error unsubscribing by token:', error);
      return { success: false };
    }
  }
}

export const subscriberService = new SubscriberService();
