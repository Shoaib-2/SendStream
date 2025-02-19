import { Request, Response, NextFunction, RequestHandler } from 'express';
import Subscriber from '../models/Subscriber';
import { APIError } from '../utils/errors';
import Papa from 'papaparse';
import mongoose from 'mongoose';
import { MailchimpService } from '../services/Integrations/mailchimp';
import Settings from '../models/Settings';

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
    settings.mailchimp.serverPrefix
  );
  
  await mailchimpService.initializeList();
  const subscribers = await mailchimpService.syncSubscribers();
  
  // Bulk upsert subscribers
  const operations = subscribers.map((sub) => ({
    updateOne: {
      filter: { email: sub.email, createdBy: req.user._id },
      update: {
        $set: {
          name: sub.name,
          status: sub.status as 'active' | 'unsubscribed',
          subscribed: sub.subscribedDate,
          source: 'mailchimp'
        }
      },
      upsert: true
    }
  }));

  await Subscriber.bulkWrite(operations);
};

export const getSubscribers: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      throw new APIError(401, "Authentication required");
    }

     // Sync Mailchimp subscribers first
     await syncMailchimpSubscribers(req);
     
    const subscribers = await Subscriber.find({ 
      createdBy: req.user._id 
    }).select('-__v').populate('createdBy', 'email');

    const formattedSubscribers = subscribers.map(sub => ({
      id: sub._id.toString(),
      email: sub.email,
      name: sub.name,
      status: sub.status,
      subscribed: sub.subscribed,
      createdBy: sub.createdBy
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
    
    // console.log('User from request:', {
    //   id: req.user._id,
    //   email: req.user.email
    // });

    // console.log('Request body:', req.body);

    const subscriber = await Subscriber.create({
      email,
      name,
      status: 'active',
      createdBy: req.user._id,
      subscribed: new Date()
    });

    // console.log('Created subscriber:', {
    //   id: subscriber._id,
    //   email: subscriber.email,
    //   createdBy: subscriber.createdBy
    // });

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
    const subscriber = await Subscriber.findById(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        status: 'error',
        message: 'Subscriber not found'
      });
    }

    await subscriber.deleteOne();
    res.status(204).send();
  } catch (error) {
    console.error('Delete subscriber error:', error);
    next(error);
  }
};

// Add bulk delete functionality
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

    // Delete subscribers that belong to the authenticated user
    const result = await Subscriber.deleteMany({
      _id: { $in: ids },
      createdBy: req.user._id
    });

    res.status(200).json({
      status: 'success',
      message: `${result.deletedCount} subscribers deleted successfully`
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
        status: 'active'
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
      ['ID', 'Email', 'Name', 'Status', 'Subscribed Date'],
      ...subscribers.map(sub => [
        sub._id.toString(),
        sub.email,
        sub.name,
        sub.status,
        sub.subscribed ? new Date(sub.subscribed).toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }) : 'N/A'
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
      console.log('Unsubscribe token:', token); // Add logging
      const subscriberId = Buffer.from(token, 'base64').toString('utf-8');
  
      const subscriber = await Subscriber.findById(subscriberId);
      if (!subscriber) {
        return res.redirect(`${process.env.CLIENT_URL}/unsubscribe-error`);
      }
  
      subscriber.status = 'unsubscribed';
      await subscriber.save();
  
      res.redirect(`${process.env.CLIENT_URL}/unsubscribe-success`);
    } catch (error) {
      next(error);
    }
  };
