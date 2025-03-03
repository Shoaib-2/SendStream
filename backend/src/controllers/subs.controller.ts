import { Request, Response, NextFunction, RequestHandler } from 'express';
import Subscriber from '../models/Subscriber';
import { APIError } from '../utils/errors';
import Papa from 'papaparse';
import mongoose from 'mongoose';
import { MailchimpService } from '../services/Integrations/mailchimp';
import Settings from '../models/Settings';
import { broadcastSubscriberUpdate } from '../server';
import { logger } from '../utils/logger';

interface MailchimpSubscriber {
  email: string;
  name: string;
  status: 'active' | 'unsubscribed';
  subscribedDate: string;
}

const syncMailchimpSubscribers = async (req: Request) => {
  const settings = await Settings.findOne({ userId: req.user._id });
  
  if (!settings?.mailchimp?.enabled) {
    return;
  }

  const mailchimpService = new MailchimpService(
    settings.mailchimp.apiKey,
    settings.mailchimp.serverPrefix.trim() // Trim to prevent URL errors
  );
  
  await mailchimpService.initializeList();
  const mailchimpSubscribers = await mailchimpService.syncSubscribers();
  
  // Get all local subscribers by email for comparison
  const localSubscribers = await Subscriber.find({ 
    createdBy: req.user._id 
  });
  
  const localSubscribersByEmail = new Map();
  localSubscribers.forEach(sub => {
    localSubscribersByEmail.set(sub.email.toLowerCase(), {
      id: sub._id.toString(),
      status: sub.status
    });
  });
  
  // Track which subscribers need updating in Mailchimp
  const mailchimpUpdates = [];
  
  // Process each mailchimp subscriber with respect to local status
  const operations = [];
  
  for (const mcSub of mailchimpSubscribers) {
    const email = mcSub.email.toLowerCase();
    const localSub = localSubscribersByEmail.get(email);
    
    if (localSub) {
      // Subscriber exists locally
      if (localSub.status === 'unsubscribed' && mcSub.status === 'active') {
        // Local shows unsubscribed but Mailchimp shows active - update Mailchimp
        mailchimpUpdates.push({
          email: mcSub.email,
          status: 'unsubscribed'
        });
        
        logger.info(`Detected status mismatch for ${email}: Local=unsubscribed, Mailchimp=active`);
        continue; // Skip updating the local record
      }
      
      // Only update local if Mailchimp shows unsubscribed but local shows active
      if (localSub.status === 'active' && mcSub.status === 'unsubscribed') {
        operations.push({
          updateOne: {
            filter: { email: mcSub.email, createdBy: req.user._id },
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
      // New subscriber from Mailchimp - add to local database
      operations.push({
        updateOne: {
          filter: { email: mcSub.email, createdBy: req.user._id },
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

  // Perform database updates if needed
  if (operations.length > 0) {
    const result = await Subscriber.bulkWrite(operations);
    
    // Notify frontend about the updates
    if (result.modifiedCount > 0 || result.upsertedCount > 0) {
      // Fetch updated subscribers to broadcast their status
      const updatedSubscribers = await Subscriber.find({
        email: { $in: mailchimpSubscribers.map(sub => sub.email) }
      });
      
      for (const sub of updatedSubscribers) {
        broadcastSubscriberUpdate(sub._id.toString(), sub.status);
      }
    }
  }
  
  // Update Mailchimp for any subscribers that need syncing
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
};

export const getSubscribers: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new APIError(401, "Authentication required");
    }

    // Sync Mailchimp subscribers first
    try {
      await syncMailchimpSubscribers(req);
    } catch (error) {
      console.error('Error syncing Mailchimp subscribers:', error);
      // Continue even if Mailchimp sync fails
    }
     
    const subscribers = await Subscriber.find({ 
      createdBy: req.user._id 
    }).select('-__v').populate('createdBy', 'email');

    const formattedSubscribers = subscribers.map(sub => ({
      id: sub._id.toString(),
      email: sub.email,
      name: sub.name,
      status: sub.status,
      subscribed: sub.subscribed,
      createdBy: sub.createdBy,
      source: sub.source || 'manual'
    }));

    res.json({ status: 'success', data: formattedSubscribers });
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    next(error);
  }
};

export const createSubscriber: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new APIError(401, 'Authentication required');
    }

    const { email, name } = req.body;

    const subscriber = await Subscriber.create({
      email,
      name,
      status: 'active',
      createdBy: req.user._id,
      subscribed: new Date(),
      source: 'manual'
    });

    res.status(201).json({
      status: 'success',
      data: subscriber
    });
  } catch (error) {
    console.error('Error creating subscriber:', error);
    next(error);
  }
};

export const deleteSubscriber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Instead of deleting, update the status to unsubscribed
    const subscriber = await Subscriber.findById(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        status: 'error',
        message: 'Subscriber not found'
      });
    }

    // Update status instead of deleting
    subscriber.status = 'unsubscribed';
    await subscriber.save();
    
    // Broadcast the status change
    broadcastSubscriberUpdate(req.params.id, 'unsubscribed');
    
    // Sync with Mailchimp if enabled
    try {
      const settings = await Settings.findOne({ userId: req.user._id });
      
      if (settings?.mailchimp?.enabled) {
        const mailchimpService = new MailchimpService(
          settings.mailchimp.apiKey,
          settings.mailchimp.serverPrefix.trim()
        );
        
        await mailchimpService.initializeList();
        await mailchimpService.updateSubscriberStatus(subscriber.email, 'unsubscribed');
        logger.info(`Updated Mailchimp status for ${subscriber.email} to unsubscribed`);
      }
    } catch (mailchimpError) {
      logger.error(`Failed to update Mailchimp for ${subscriber.email}:`, mailchimpError);
    }

    res.status(200).json({
      status: 'success',
      data: subscriber
    });
  } catch (error) {
    console.error('Delete subscriber error:', error);
    next(error);
  }
};

export const bulkDeleteSubscribers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      throw new APIError(400, 'Invalid subscriber IDs');
    }

    if (!req.user?._id) {
      throw new APIError(401, 'Authentication required');
    }

    // Validate all IDs are valid MongoDB ObjectIds
    const validIds = ids.every(id => mongoose.Types.ObjectId.isValid(id));
    if (!validIds) {
      throw new APIError(400, 'Invalid subscriber ID format in the list');
    }

    // Get subscribers before updating to access their emails
    const subscribers = await Subscriber.find({
      _id: { $in: ids },
      createdBy: req.user._id
    });

    if (subscribers.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No subscribers found to delete'
      });
    }

    // Update subscribers to unsubscribed instead of deleting
    const result = await Subscriber.updateMany(
      { _id: { $in: ids }, createdBy: req.user._id },
      { $set: { status: 'unsubscribed' } }
    );

    // Broadcast updates
    for (const sub of subscribers) {
      broadcastSubscriberUpdate(sub._id.toString(), 'unsubscribed');
    }

    // Sync with Mailchimp if enabled
    try {
      const settings = await Settings.findOne({ userId: req.user._id });
      
      if (settings?.mailchimp?.enabled) {
        const mailchimpService = new MailchimpService(
          settings.mailchimp.apiKey,
          settings.mailchimp.serverPrefix.trim()
        );
        
        await mailchimpService.initializeList();
        
        // Update each subscriber in Mailchimp
        for (const sub of subscribers) {
          await mailchimpService.updateSubscriberStatus(sub.email, 'unsubscribed');
        }
        
        logger.info(`Updated ${subscribers.length} subscribers in Mailchimp to unsubscribed`);
      }
    } catch (mailchimpError) {
      logger.error('Failed to update Mailchimp for bulk unsubscribe:', mailchimpError);
    }

    res.status(200).json({
      status: 'success',
      message: `${result.modifiedCount} subscribers marked as unsubscribed`
    });
  } catch (error) {
    console.error('Bulk delete subscribers error:', error);
    next(error);
  }
};

export const importSubscribers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { csvData } = req.body;
    
    if (!csvData) {
      return res.status(400).json({
        status: 'error',
        message: 'CSV data is required'
      });
    }

    const parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true
    });

    if (parsedData.errors.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'CSV parsing error'
      });
    }

    const subscribers = await Subscriber.create(
      parsedData.data.map((row) => ({
        ...row as Record<string, any>,
        createdBy: req.user._id,
        status: 'active',
        source: 'csv'
      }))
    );

    return res.status(201).json({
      status: 'success',
      imported: subscribers.length,
      data: subscribers
    });

  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      return res.status(500).json({
        status: 'error',
        message: 'duplicate key error'
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
};

export const exportSubscribers: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      throw new APIError(401, "Authentication required");
    }

    const subscribers = await Subscriber.find({ createdBy: req.user._id });

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

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to export subscribers' 
    });
  }
};

export const unsubscribeSubscriber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.params.token as string;
    console.log('Unsubscribe token:', token);
    const subscriberId = Buffer.from(token, 'base64').toString('utf-8');

    const subscriber = await Subscriber.findById(subscriberId);
    if (!subscriber) {
      return res.redirect(`${process.env.CLIENT_URL}/unsubscribe-error`);
    }

    subscriber.status = 'unsubscribed';
    await subscriber.save();
    
    // Broadcast the update to all connected WebSocket clients
    broadcastSubscriberUpdate(subscriberId, 'unsubscribed');
    
    // Update Mailchimp if integration is enabled
    try {
      const settings = await Settings.findOne({ userId: subscriber.createdBy });
      
      if (settings?.mailchimp?.enabled) {
        const mailchimpService = new MailchimpService(
          settings.mailchimp.apiKey,
          settings.mailchimp.serverPrefix.trim()
        );
        
        await mailchimpService.initializeList();
        await mailchimpService.updateSubscriberStatus(subscriber.email, 'unsubscribed');
        logger.info(`Updated Mailchimp status for ${subscriber.email} to unsubscribed via unsubscribe link`);
      }
    } catch (mailchimpError) {
      logger.error(`Failed to update Mailchimp for ${subscriber.email} via unsubscribe link:`, mailchimpError);
    }

    res.redirect(`${process.env.CLIENT_URL}/unsubscribe-success`);
  } catch (error) {
    next(error);
  }
};

export const updateSubscriber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const subscriber = await Subscriber.findById(id);
    if (!subscriber) {
      return res.status(404).json({
        status: 'error',
        message: 'Subscriber not found'
      });
    }
    
    // Update the subscriber status
    subscriber.status = status;
    await subscriber.save();
    
    // Broadcast the update
    broadcastSubscriberUpdate(id, status);
    
    // Update Mailchimp if integration is enabled
    try {
      const settings = await Settings.findOne({ userId: subscriber.createdBy });
      
      if (settings?.mailchimp?.enabled) {
        const mailchimpService = new MailchimpService(
          settings.mailchimp.apiKey,
          settings.mailchimp.serverPrefix.trim()
        );
        
        await mailchimpService.initializeList();
        // Convert status to Mailchimp format: 'active' => 'subscribed', 'unsubscribed' => 'unsubscribed'
        const mailchimpStatus = status === 'active' ? 'subscribed' : 'unsubscribed';
        await mailchimpService.updateSubscriberStatus(subscriber.email, mailchimpStatus);
        logger.info(`Updated Mailchimp status for ${subscriber.email} to ${mailchimpStatus}`);
      }
    } catch (mailchimpError) {
      logger.error(`Failed to update Mailchimp for ${subscriber.email}:`, mailchimpError);
    }
    
    return res.json({
      status: 'success',
      data: subscriber
    });
  } catch (error) {
    console.error('Error updating subscriber:', error);
    next(error);
  }
};