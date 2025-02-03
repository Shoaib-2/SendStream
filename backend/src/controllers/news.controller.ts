// backend/src/controllers/newsletter.controller.ts
import { Request, Response, NextFunction } from 'express';
import Newsletter from '../models/Newsletter';
import { APIError } from '../utils/errors';
import { logger } from '../utils/logger';

export class NewsletterController {
  /**
   * Create a new newsletter
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const newsletter = await Newsletter.create({
        ...req.body,
        createdBy: req.user._id
      });

      res.status(201).json({
        status: 'success',
        data: newsletter
      });
    } catch (error) {
      logger.error('Error creating newsletter:', error);
      next(error);
    }
  }

  /**
   * Get all newsletters with pagination
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      const newsletters = await Newsletter.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Newsletter.countDocuments();

      res.json({
        status: 'success',
        data: newsletters,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error getting newsletters:', error);
      next(error);
    }
  }

  /**
   * Update newsletter
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const newsletter = await Newsletter.findById(req.params.id);

      if (!newsletter) {
        throw new APIError(404, 'Newsletter not found');
      }

      if (newsletter.status === 'sent') {
        throw new APIError(400, 'Cannot update sent newsletter');
      }

      const updatedNewsletter = await Newsletter.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      res.json({
        status: 'success',
        data: updatedNewsletter
      });
    } catch (error) {
      logger.error('Error updating newsletter:', error);
      next(error);
    }
  }

  /**
   * Schedule newsletter
   */
  async schedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { scheduledDate } = req.body;
      const newsletter = await Newsletter.findById(req.params.id);

      if (!newsletter) {
        throw new APIError(404, 'Newsletter not found');
      }

      if (newsletter.status === 'sent') {
        throw new APIError(400, 'Cannot schedule sent newsletter');
      }

      if (new Date(scheduledDate) < new Date()) {
        throw new APIError(400, 'Scheduled date must be in the future');
      }

      newsletter.status = 'scheduled';
      newsletter.scheduledDate = new Date(scheduledDate);
      await newsletter.save();

      res.json({
        status: 'success',
        data: newsletter
      });
    } catch (error) {
      logger.error('Error scheduling newsletter:', error);
      next(error);
    }
  }

  /**
   * Delete newsletter
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const newsletter = await Newsletter.findById(req.params.id);

      if (!newsletter) {
        throw new APIError(404, 'Newsletter not found');
      }

      if (newsletter.status === 'sent') {
        throw new APIError(400, 'Cannot delete sent newsletter');
      }

      await newsletter.deleteOne();

      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting newsletter:', error);
      next(error);
    }
  }
}

export const newsletterController = new NewsletterController();