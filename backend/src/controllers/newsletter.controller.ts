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
import Settings from "../models/Settings";




export class NewsletterController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new APIError(401, "Authentication required");
  
      const contentQuality = {
        isOriginalContent: req.body.contentQuality?.isOriginalContent || false,
        hasResearchBacked: req.body.contentQuality?.hasResearchBacked || false,
        hasActionableInsights: req.body.contentQuality?.hasActionableInsights || false,
        contentLength: req.body.content?.length || 0,
        sources: req.body.contentQuality?.sources || [],
        keyTakeaways: req.body.contentQuality?.keyTakeaways || [],
        qualityScore: 0
      };
  
      const newsletter = await Newsletter.create({
        ...req.body,
        createdBy: req.user._id,
        contentQuality
      });
  
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
      const newsletters = await Newsletter.find({
        createdBy: req.user._id
      }).sort({ createdAt: -1 }).lean();
  
      const qualityStats: {
        averageScore: number,
        topPerformers: typeof newsletters,
        qualityDistribution: {
          high: number,
          medium: number,
          low: number
        }
      } = {
        averageScore: 0,
        topPerformers: [],
        qualityDistribution: {
          high: 0,    // 75-100
          medium: 0,  // 50-74
          low: 0      // 0-49
        }
      };
  
      if (newsletters.length > 0) {
        const scores = newsletters.map(n => n.contentQuality.qualityScore);
        qualityStats.averageScore = scores.reduce((a, b) => a + b) / scores.length;
        
        newsletters.forEach(n => {
          const score = n.contentQuality.qualityScore;
          if (score >= 75) qualityStats.qualityDistribution.high++;
          else if (score >= 50) qualityStats.qualityDistribution.medium++;
          else qualityStats.qualityDistribution.low++;
        });
  
        qualityStats.topPerformers = newsletters
          .sort((a, b) => b.contentQuality.qualityScore - a.contentQuality.qualityScore)
          .slice(0, 5);
      }
  
      res.json({
        status: "success",
        data: { newsletters, qualityStats }
      });
    } catch (error) {
      next(error);
    }
  };
  
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

      const newslettersWithStats = newsletters.map((newsletter) => ({
        ...newsletter.toObject(),
        sent: newsletter.sentTo || 0,
        contentQuality: newsletter.contentQuality
      }));

      res.json({
        status: "success",
        data: newslettersWithStats,
      });
    } catch (error) {
      next(error);
    }
  }

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

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const newsletter = await Newsletter.findById(req.params.id);
      if (!newsletter) throw new APIError(404, "Newsletter not found");
      if (newsletter.status === "sent") throw new APIError(400, "Cannot update sent newsletter");
  
      const contentQuality = {
        isOriginalContent: req.body.contentQuality?.isOriginalContent ?? newsletter.contentQuality.isOriginalContent,
        hasResearchBacked: req.body.contentQuality?.hasResearchBacked ?? newsletter.contentQuality.hasResearchBacked,
        hasActionableInsights: req.body.contentQuality?.hasActionableInsights ?? newsletter.contentQuality.hasActionableInsights,
        contentLength: req.body.content?.length || newsletter.contentQuality.contentLength,
        sources: req.body.contentQuality?.sources ?? newsletter.contentQuality.sources,
        keyTakeaways: req.body.contentQuality?.keyTakeaways ?? newsletter.contentQuality.keyTakeaways,
        qualityScore: 0
      };
  
      const updatedNewsletter = await Newsletter.findByIdAndUpdate(
        req.params.id,
        { ...req.body, contentQuality },
        { new: true, runValidators: true }
      );
  
      updatedNewsletter?.calculateQualityScore();
      await updatedNewsletter?.save();
  
      res.json({
        status: "success",
        data: updatedNewsletter
      });
    } catch (error) {
      next(error);
    }
  };

  async schedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { scheduledDate } = req.body;
      const scheduleTime = new Date(parseInt(scheduledDate));
      const now = new Date();
  
      if (scheduleTime.getTime() <= now.getTime() + 30000) {
        return res.status(400).json({
          status: 'error',
          message: 'Scheduled date must be at least 30 seconds in the future'
        });
      }
  
      const newsletter = await Newsletter.findById(req.params.id);
      if (!newsletter) {
        return res.status(404).json({
          status: 'error',
          message: 'Newsletter not found'
        });
      }
  
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
  
      const updatedNewsletter = await Newsletter.findByIdAndUpdate(
        req.params.id,
        {
          status: 'scheduled',
          scheduledDate: scheduleTime,
          sentTo: subscribers.length
        },
        { new: true, runValidators: true }
      );

      await cronService.scheduleNewsletter(req.params.id, scheduleTime);
  
      return res.json({
        status: "success",
        data: updatedNewsletter
      });
    } catch (error) {
      next(error);
    }
  }

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

 
// Updated send method for newsletter.controller.ts

async send(req: Request, res: Response, next: NextFunction) {
  try {
    logger.info('=== NEWSLETTER SEND DEBUG START ===');
    logger.info('User ID:', req.user._id);
    logger.info('Newsletter ID:', req.params.id);

    const newsletter = await Newsletter.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!newsletter) {
      logger.error('Newsletter not found');
      throw new APIError(404, "Newsletter not found");
    }

    logger.info('Newsletter found:', {
      id: newsletter._id,
      title: newsletter.title,
      status: newsletter.status
    });

    // Get subscribers with detailed logging
    const subscribers = await Subscriber.find({
      status: "active",
      createdBy: req.user._id,
    });

    logger.info('Subscriber query results:', {
      count: subscribers.length,
      userID: req.user._id,
      subscriberEmails: subscribers.map(s => ({ email: s.email, status: s.status }))
    });

    if (!subscribers || subscribers.length === 0) {
      logger.warn('No active subscribers found to send newsletter to');
      throw new APIError(400, "No active subscribers to send newsletter to");
    }

    logger.info(`Found ${subscribers.length} active subscribers`);

    // Get or create user settings with detailed logging
    let userSettings = await Settings.findOne({ userId: req.user._id });
    
    logger.info('User settings lookup:', {
      found: !!userSettings,
      userId: req.user._id
    });

    if (!userSettings) {
      logger.info('Creating default settings for user');
      userSettings = await Settings.create({
        userId: req.user._id,
        email: { 
          fromName: 'Newsletter', 
          replyTo: 'noreply@yourdomain.com',
          senderEmail: 'noreply@yourdomain.com' 
        },
        mailchimp: {
          apiKey: '',
          serverPrefix: '',
          enabled: false,
          autoSync: false
        }
      });
      logger.info('Default settings created');
    }

    // Log settings details (without sensitive info)
    logger.info('Settings configuration:', {
      hasEmail: !!userSettings.email,
      fromName: userSettings.email?.fromName,
      replyTo: userSettings.email?.replyTo,
      senderEmail: userSettings.email?.senderEmail,
      hasMailchimp: !!userSettings.mailchimp
    });

    // Validate settings
    if (!userSettings.email || !userSettings.email.fromName) {
      logger.error('Invalid email settings configuration');
      throw new APIError(400, "Email settings not properly configured. Please configure 'From Name' in settings.");
    }

    logger.info('About to call emailService.sendNewsletter');
    logger.info('Email service environment check:', {
      hasSmtpHost: !!process.env.EMAIL_HOST,
      hasSmtpPort: !!process.env.EMAIL_PORT,
      hasSmtpUser: !!process.env.EMAIL_USER,
      hasSmtpPass: !!process.env.EMAIL_PASSWORD,
      smtpHost: process.env.EMAIL_HOST, // Log this to see the actual value
      smtpPort: process.env.EMAIL_PORT
    });

    try {
      // Try to send the newsletter
      await emailService.sendNewsletter(newsletter, subscribers, userSettings);
      
      logger.info('Email service completed successfully');
      
      // Update newsletter status after successful send
      newsletter.status = "sent";
      newsletter.sentDate = new Date();
      newsletter.sentTo = subscribers.length;
      await newsletter.save();

      logger.info('Newsletter status updated to sent');

      // Create analytics record
      await Analytics.create({
        newsletterId: newsletter._id,
        createdBy: req.user._id,
        unsubscribes: { count: 0, details: [] }
      });

      logger.info('Analytics record created');

      // Delete draft version if exists
      await Newsletter.deleteOne({
        title: newsletter.title,
        status: "draft",
        createdBy: req.user._id,
        _id: { $ne: newsletter._id }
      });

      logger.info('Draft cleanup completed');
      logger.info('=== NEWSLETTER SEND DEBUG END - SUCCESS ===');

      return res.json({ 
        status: "success", 
        data: newsletter 
      });
    } catch (sendError: unknown) {
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error occurred';
      const errorStack = sendError instanceof Error ? sendError.stack : undefined;
      const errorName = sendError instanceof Error ? sendError.name : 'UnknownError';
      
      logger.error("Email service failed:", { 
        error: errorMessage,
        stack: errorStack,
        name: errorName,
        newsletter: newsletter._id 
      });
      logger.info('=== NEWSLETTER SEND DEBUG END - EMAIL SERVICE ERROR ===');
      throw new APIError(500, `Failed to send newsletter: ${errorMessage}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    logger.error("Send newsletter error:", {
      message: errorMessage,
      stack: errorStack,
      name: errorName
    });
    logger.info('=== NEWSLETTER SEND DEBUG END - ERROR ===');
    next(error);
  }
}

  public async sendScheduledNewsletter(newsletterId: string) {
    try {
      const newsletter = await Newsletter.findById(newsletterId);
      if (!newsletter) return;

      const subscribers = await Subscriber.find({
        status: "active",
        createdBy: newsletter.createdBy,
      });

      const userSettings = await Settings.findOne({ userId: newsletter.createdBy });
      await emailService.sendNewsletter(newsletter, subscribers, userSettings);
      const updatedNewsletter = await Newsletter.findByIdAndUpdate(
        newsletterId,
        { status: "sent", sentDate: new Date() },
        { new: true }
      );

      if (updatedNewsletter) {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            if ((client as any).user && (client as any).user._id === newsletter.createdBy.toString()) {
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
    }
  }
}

export const newsletterController = new NewsletterController();