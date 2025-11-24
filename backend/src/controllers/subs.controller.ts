import { Request, Response, NextFunction, RequestHandler } from 'express';
import { subscriberService } from '../services/subscriber.service';
import { broadcastSubscriberUpdate } from '../server';
import { logger } from '../utils/logger';
import { cacheService, CacheKeys } from '../services/cache.service';

export const getSubscribers: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return next(new Error('Authentication required'));
    }

    // Use cache for subscriber list
    const cacheKey = CacheKeys.subscriberCount(req.user._id);
    const subscribers = await cacheService.getOrSet(
      cacheKey,
      async () => await subscriberService.getAllSubscribers(req.user._id),
      60 * 1000 // Cache for 1 minute
    );

    res.json({ status: 'success', data: subscribers });
  } catch (error) {
    logger.error('Error fetching subscribers:', error);
    next(error);
  }
};

export const createSubscriber: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return next(new Error('Authentication required'));
    }

    const { email, name } = req.body;
    const subscriber = await subscriberService.createSubscriber(email, name, req.user._id);

    // Invalidate subscriber cache
    cacheService.deletePattern(`subscribers:${req.user._id}:.*`);

    res.status(201).json({
      status: 'success',
      data: subscriber
    });
  } catch (error) {
    logger.error('Error creating subscriber:', error);
    return next(error);
  }
};

export const deleteSubscriber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?._id) {
      return next(new Error('Authentication required'));
    }

    const subscriber = await subscriberService.updateSubscriberStatus(
      req.params.id,
      'unsubscribed',
      req.user._id
    );
    
    // Invalidate subscriber cache
    cacheService.deletePattern(`subscribers:${req.user._id}:.*`);
    
    broadcastSubscriberUpdate(req.params.id, 'unsubscribed');

    res.status(200).json({
      status: 'success',
      data: subscriber
    });
  } catch (error) {
    logger.error('Delete subscriber error:', error);
    return next(error);
  }
};

export const bulkDeleteSubscribers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?._id) {
      return next(new Error('Authentication required'));
    }

    const { ids } = req.body;
    const modifiedCount = await subscriberService.bulkUnsubscribe(ids, req.user._id);

    if (modifiedCount === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No subscribers found to delete'
      });
    }

    // Invalidate subscriber cache
    cacheService.deletePattern(`subscribers:${req.user._id}:.*`);

    // Broadcast updates
    for (const id of ids) {
      broadcastSubscriberUpdate(id, 'unsubscribed');
    }

    res.status(200).json({
      status: 'success',
      message: `${modifiedCount} subscribers marked as unsubscribed`
    });
  } catch (error) {
    logger.error('Bulk delete subscribers error:', error);
    return next(error);
  }
};

export const importSubscribers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?._id) {
      return next(new Error('Authentication required'));
    }

    const { csvData } = req.body;
    const result = await subscriberService.importSubscribers(csvData, req.user._id);

    // Invalidate subscriber cache after import
    cacheService.deletePattern(`subscribers:${req.user._id}:.*`);

    return res.status(201).json({
      status: 'success',
      imported: result.imported,
      data: result.subscribers
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
      return res.status(500).json({
        status: 'error',
        message: 'duplicate key error'
      });
    }
    
    return next(error);
  }
};

export const exportSubscribers: RequestHandler = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new Error('Authentication required'));
    }

    const csvContent = await subscriberService.exportSubscribers(req.user._id);

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
    const result = await subscriberService.unsubscribeByToken(token);

    if (!result.success) {
      return res.redirect(`${process.env.CLIENT_URL}/unsubscribe-error`);
    }

    if (result.subscriber) {
      broadcastSubscriberUpdate(result.subscriber._id.toString(), 'unsubscribed');
    }

    res.redirect(`${process.env.CLIENT_URL}/unsubscribe-success`);
  } catch (error) {
    return next(error);
  }
};

export const updateSubscriber = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user?._id) {
      return next(new Error('Authentication required'));
    }

    const { id } = req.params;
    const { status } = req.body;
    
    const subscriber = await subscriberService.updateSubscriberStatus(id, status, req.user._id);
    
    // Invalidate subscriber cache
    cacheService.deletePattern(`subscribers:${req.user._id}:.*`);
    
    broadcastSubscriberUpdate(id, status);
    
    return res.json({
      status: 'success',
      data: subscriber
    });
  } catch (error) {
    logger.error('Error updating subscriber:', error);
    return next(error);
  }
};