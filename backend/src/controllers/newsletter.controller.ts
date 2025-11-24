import WebSocket from "ws";
import { wss } from "../server";
import { Request, Response, NextFunction } from "express";
import { newsletterService } from "../services/newsletter.service";
import { logger } from "../utils/logger";

export class NewsletterController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Authentication required'));
  
      const newsletter = await newsletterService.createNewsletter(req.body, req.user._id);
  
      res.status(201).json({
        status: "success",
        data: newsletter
      });
    } catch (error) {
      next(error);
    }
  };

  async getNewsletterStats(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Authentication required'));
      
      const data = await newsletterService.getNewsletterStats(req.user._id);
  
      res.json({
        status: "success",
        data
      });
    } catch (error) {
      next(error);
    }
  };
  
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Authentication required'));
      
      const newsletters = await newsletterService.getAllNewsletters(req.user._id);

      res.json({
        status: "success",
        data: newsletters,
      });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Authentication required'));
      
      const newsletter = await newsletterService.getNewsletterById(req.params.id, req.user._id);

      res.json({
        status: "success",
        data: newsletter,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Authentication required'));
      
      const updatedNewsletter = await newsletterService.updateNewsletter(
        req.params.id,
        req.body
      );
  
      res.json({
        status: "success",
        data: updatedNewsletter
      });
    } catch (error) {
      return next(error);
    }
  };

  async schedule(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) return next(new Error('Authentication required'));
      
      const { scheduledDate } = req.body;
      const updatedNewsletter = await newsletterService.scheduleNewsletter(
        req.params.id,
        scheduledDate,
        req.user._id
      );
  
      return res.json({
        status: "success",
        data: updatedNewsletter
      });
    } catch (error) {
      return next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await newsletterService.deleteNewsletter(req.params.id);
      res.status(204).send();
    } catch (error) {
      logger.error("Error deleting newsletter:", error);
      next(error);
    }
  }

async send(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return next(new Error('Authentication required'));
    
    const result = await newsletterService.sendNewsletter(req.params.id, req.user._id);

    return res.json({ 
      status: "success", 
      data: result.newsletter,
      message: result.message
    });
  } catch (error) {
    return next(error);
  }
}

  public async sendScheduledNewsletter(newsletterId: string) {
    try {
      const updatedNewsletter = await newsletterService.sendScheduledNewsletter(newsletterId);
      
      if (updatedNewsletter) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            if ((client as any).user && (client as any).user._id === updatedNewsletter.createdBy.toString()) {
              client.send(
                JSON.stringify({
                  type: "newsletter_update",
                  newsletter: updatedNewsletter,
                })
              );
            } else {
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
      return;
    }
  }
}

export const newsletterController = new NewsletterController();