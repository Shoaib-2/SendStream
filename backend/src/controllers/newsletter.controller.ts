// backend/src/controllers/newsletter.controller.ts
import WebSocket from "ws";
import { cronService } from "../services/cron.service";
import { wss } from "../server";

import { Request, Response, NextFunction } from "express";
import Newsletter from "../models/Newsletter";
import { APIError } from "../utils/errors";
import { logger } from "../utils/logger";
import { emailService } from "../services/email.service";
import Subscriber from "../models/Subscriber";
import Analytics from "../models/analytics";

import { calculateNewsletterStats } from "../utils/analytics.utils";
import subscribers from "../routes/subscribers";

export class NewsletterController {
  /**
   * Create a new newsletter
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new APIError(401, "Authentication required");
      }

      const newsletterData = {
        title: req.body.title,
        subject: req.body.subject,
        content: req.body.content,
        status: "draft",
        createdBy: req.user._id,
      };

      const newsletter = await Newsletter.create(newsletterData);
      res.status(201).json({
        status: "success",
        data: newsletter,
      });
    } catch (error) {
      console.error("Create newsletter error:", error);
      next(error);
    }
  }

  /**
   * Get all newsletters stats
   */
  async getNewsletterStats(req: Request, res: Response, next: NextFunction) {
    try {
      const newsletters = await Newsletter.find({
        createdBy: req.user._id,
      }).sort({ createdAt: -1 });

      const newslettersWithStats = await Promise.all(
        newsletters.map(async (newsletter) => {
          const stats = await calculateNewsletterStats(
            newsletter,
            req.user._id
          );
          return {
            _id: newsletter._id,
            title: newsletter.title,
            status: newsletter.status,
            sentDate: newsletter.sentDate,
            scheduledDate: newsletter.scheduledDate,
            openRate: stats.openRate,
            clickRate: newsletter.clickRate,
          };
        })
      );

      res.json({
        status: "success",
        data: newslettersWithStats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all newsletters with pagination
   */
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const newsletters = await Newsletter.find({
        createdBy: req.user._id,
        $or: [
          { status: "draft" },
          { status: "scheduled" },
          {
            status: "sent",
            sentDate: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        ],
      }).sort("-createdAt");

      const newslettersWithStats = await Promise.all(
        newsletters.map(async (newsletter) => {
          const stats = await calculateNewsletterStats(newsletter);
          return {
            ...newsletter.toObject(),
            openRate: stats.openRate,
            opens: stats.opens,
            sent: stats.sent,
          };
        })
      );

      res.json({
        status: "success",
        data: newslettersWithStats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get one newsletter with editing
   */
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const newsletter = await Newsletter.findOne({
        _id: req.params.id,
        createdBy: req.user._id,
      });

      if (!newsletter) {
        throw new APIError(404, "Newsletter not found");
      }

      res.json({
        status: "success",
        data: newsletter,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Updates newsletter
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const newsletter = await Newsletter.findById(req.params.id);

      if (!newsletter) {
        throw new APIError(404, "Newsletter not found");
      }

      if (newsletter.status === "sent") {
        throw new APIError(400, "Cannot update sent newsletter");
      }

      const updatedNewsletter = await Newsletter.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      res.json({
        status: "success",
        data: updatedNewsletter,
      });
    } catch (error) {
      logger.error("Error updating newsletter:", error);
      next(error);
    }
  }

  /**
   * Schedule newsletter
   */
  async schedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { scheduledDate } = req.body;
      const scheduleTime = new Date(parseInt(scheduledDate));
      const now = new Date();
  
      // Validate schedule time
      if (scheduleTime.getTime() <= now.getTime() + 30000) {
        return res.status(400).json({
          status: 'error',
          message: 'Scheduled date must be at least 30 seconds in the future'
        });
      }
  
      // Find newsletter and validate existence
      const newsletter = await Newsletter.findById(req.params.id);
      if (!newsletter) {
        return res.status(404).json({
          status: 'error',
          message: 'Newsletter not found'
        });
      }
  
      // Validate ownership
      if (newsletter.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Not authorized to modify this newsletter'
        });
      }
  
      const subscribers = await Subscriber.find({
        status: "active",
        createdBy: req.user._id,
      });
  
      // Update newsletter
      const updatedNewsletter = await Newsletter.findByIdAndUpdate(
        req.params.id,
        {
          status: 'scheduled',
          scheduledDate: scheduleTime,
          sentTo: subscribers.length
        },
        { new: true, runValidators: true }
      );

      // Schedule the newsletter using cronService
      await cronService.scheduleNewsletter(req.params.id, scheduleTime);
  
      return res.json({
        status: "success",
        data: updatedNewsletter
      });
    } catch (error) {
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
        throw new APIError(404, "Newsletter not found");
      }

      if (newsletter.status === "sent") {
        throw new APIError(400, "Cannot delete sent newsletter");
      }

      await newsletter.deleteOne();

      res.status(204).send();
    } catch (error) {
      logger.error("Error deleting newsletter:", error);
      next(error);
    }
  }

  /**
   * Send newsletter
   */
  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const newsletter = await Newsletter.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user._id },
        { status: "sent", sentDate: new Date() },
        { new: true }
      );

      if (!newsletter) throw new APIError(404, "Newsletter not found");

      // Find and delete any draft version first
      await Newsletter.deleteOne({
        title: newsletter.title,
        status: "draft",
        createdBy: req.user._id,
      });

      // Create an analytics record for the sent newsletter
      await Analytics.create({
        newsletterId: newsletter._id,
        createdBy: req.user._id,
        opens: { count: 0, details: [] },
        clicks: { count: 0, details: [] },
        bounces: { count: 0, details: [] },
        unsubscribes: { count: 0, details: [] }
      });

      const subscribers = await Subscriber.find({
        status: "active",
        createdBy: req.user._id,
      });

      await emailService.sendNewsletter(newsletter, subscribers);
      newsletter.sentTo = subscribers.length;
      await newsletter.save();

      res.json({ status: "success", data: newsletter });
    } catch (error) {
      console.error("Send newsletter error:", error);
      next(error);
    }
  }

  /**
   * Track newsletter open
   */
  async trackOpen(req: Request, res: Response, next: NextFunction) {
    try {
      const { newsletterId, subscriberId } = req.params;
      const today = new Date().toISOString().split('T')[0];
      
      const result = await Newsletter.findById(newsletterId, subscriberId);
      if (!result) {
        throw new APIError(404, 'Newsletter not found');
      }
  
      const totalSent = result.sentTo || 0;
      const updatedResult = await Newsletter.findByIdAndUpdate(
        newsletterId,
        {
          $push: {
            'dailyStats': {
              $each: [{
                date: today,
                opens: 1,
                clicks: 0
              }]
            }
          }
        },
        { new: true }
      );
  
      if (updatedResult) {
        const todayStats = updatedResult.dailyStats?.find(stat => stat.date === today);
        const openRate = todayStats ? (todayStats.opens / totalSent) * 100 : 0;
        
        await Newsletter.findByIdAndUpdate(newsletterId, { openRate });
      }
      
      res.setHeader('Content-Type', 'image/gif');
      res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    } catch (error) {
      console.error('Tracking error:', error);
      res.status(500).end();
    }
  };

  public async sendScheduledNewsletter(newsletterId: string) {
    try {
      const newsletter = await Newsletter.findById(newsletterId);
      if (!newsletter) return;

      const subscribers = await Subscriber.find({
        status: "active",
        createdBy: newsletter.createdBy,
      });

      await emailService.sendNewsletter(newsletter, subscribers);
      const updatedNewsletter = await Newsletter.findByIdAndUpdate(
        newsletterId,
        { status: "sent", sentDate: new Date() },
        { new: true }
      );

      // Broadcast update via WebSocket
      if (updatedNewsletter) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            // If client is authenticated and owns the newsletter, send full details
            if ((client as any).user && (client as any).user._id === newsletter.createdBy.toString()) {
              client.send(
                JSON.stringify({
                  type: "newsletter_update",
                  newsletter: updatedNewsletter,
                })
              );
            } else {
              // For unauthenticated clients or other users, send limited info
              const limitedInfo = {
                _id: updatedNewsletter._id,
                status: updatedNewsletter.status,
                lastUpdated: new Date().toISOString()
              };
              client.send(
                JSON.stringify({
                  type: "newsletter_update",
                  newsletter: limitedInfo,
                })
              );
            }
          }
        });
      }
    } catch (error) {
      logger.error("Failed to send scheduled newsletter:", error);
    }
  }
}

export const newsletterController = new NewsletterController();
