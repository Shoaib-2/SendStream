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

  /**
   * Validates email settings and SMTP configuration
   */
  private validateEmailConfiguration(userSettings: any): { isValid: boolean; error?: string } {
    // Check if basic settings exist
    if (!userSettings || !userSettings.email) {
      return { isValid: false, error: "Email settings not found. Please configure your email settings." };
    }

    const { email } = userSettings;

    // Check required email fields
    if (!email.fromName || email.fromName.trim() === '') {
      return { isValid: false, error: "From Name is required. Please set your sender name in email settings." };
    }

    if (!email.senderEmail || email.senderEmail.trim() === '') {
      return { isValid: false, error: "Sender Email is required. Please set your sender email in email settings." };
    }

    if (!email.replyTo || email.replyTo.trim() === '') {
      return { isValid: false, error: "Reply-To email is required. Please configure your reply-to email in settings." };
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.senderEmail)) {
      return { isValid: false, error: "Sender email format is invalid. Please provide a valid email address." };
    }

    if (!emailRegex.test(email.replyTo)) {
      return { isValid: false, error: "Reply-To email format is invalid. Please provide a valid email address." };
    }

    // Check SMTP environment variables
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_PORT || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return { isValid: false, error: "SMTP configuration is incomplete. Please contact administrator." };
    }

    return { isValid: true };
  }

  /**
   * Creates or updates user settings with better defaults
   */
  private async ensureUserSettings(userId: string): Promise<any> {
    let userSettings = await Settings.findOne({ userId });
    
    if (!userSettings) {
      logger.info('Creating default settings for user:', userId);
      
      // Use environment variable for default sender email or fallback
      const defaultSenderEmail = process.env.DEFAULT_SENDER_EMAIL || 'newsletter@example.com';
      
      userSettings = await Settings.create({
        userId,
        email: { 
          fromName: 'Newsletter Team', 
          replyTo: defaultSenderEmail,
          senderEmail: defaultSenderEmail
        },
        mailchimp: {
          apiKey: '',
          serverPrefix: '',
          enabled: false,
          autoSync: false
        }
      });
      
      logger.info('Default settings created with sender email:', defaultSenderEmail);
    }

    return userSettings;
  }

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

    // Ensure user settings exist and are properly configured
    const userSettings = await this.ensureUserSettings(req.user._id);
    
    logger.info('User settings after ensuring defaults:', {
      found: !!userSettings,
      hasEmail: !!userSettings.email,
      fromName: userSettings.email?.fromName,
      replyTo: userSettings.email?.replyTo,
      senderEmail: userSettings.email?.senderEmail,
    });

    // Validate email configuration
    const validation = this.validateEmailConfiguration(userSettings);
    if (!validation.isValid) {
      logger.error('Email configuration validation failed:', validation.error);
      throw new APIError(400, validation.error!);
    }

    logger.info('Email configuration validation passed');

    // Additional SMTP environment check with better logging
    const smtpConfig = {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD
    };

    logger.info('SMTP Configuration:', smtpConfig);

    if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.hasPassword) {
      logger.error('SMTP environment variables missing');
      throw new APIError(500, "Email server configuration is incomplete. Please contact administrator.");
    }

    logger.info('About to call emailService.sendNewsletter with validated settings');

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
        data: newsletter,
        message: `Newsletter sent successfully to ${subscribers.length} subscribers`
      });
    } catch (sendError: unknown) {
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error occurred';
      const errorStack = sendError instanceof Error ? sendError.stack : undefined;
      const errorName = sendError instanceof Error ? sendError.name : 'UnknownError';
      
      logger.error("Email service failed:", { 
        error: errorMessage,
        stack: errorStack,
        name: errorName,
        newsletter: newsletter._id,
        subscriberCount: subscribers.length,
        userSettings: {
          hasEmail: !!userSettings.email,
          senderEmail: userSettings.email?.senderEmail,
          fromName: userSettings.email?.fromName
        }
      });
      logger.info('=== NEWSLETTER SEND DEBUG END - EMAIL SERVICE ERROR ===');
      
      // Provide more specific error messages
      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
        throw new APIError(500, "Unable to connect to email server. Please check your internet connection or contact administrator.");
      } else if (errorMessage.includes('Invalid login') || errorMessage.includes('Authentication failed')) {
        throw new APIError(500, "Email authentication failed. Please check email server credentials.");
      } else if (errorMessage.includes('recipients')) {
        throw new APIError(500, "Failed to send to recipients. Please check subscriber email addresses and try again.");
      } else {
        throw new APIError(500, `Failed to send newsletter: ${errorMessage}`);
      }
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

      const userSettings = await this.ensureUserSettings(newsletter.createdBy.toString());
      
      // Validate settings before sending
      const validation = this.validateEmailConfiguration(userSettings);
      if (!validation.isValid) {
        logger.error('Scheduled newsletter failed - invalid email configuration:', validation.error);
        return;
      }

      await emailService.sendNewsletter(newsletter, subscribers, userSettings);
      const updatedNewsletter = await Newsletter.findByIdAndUpdate(
        newsletterId,
        { status: "sent", sentDate: new Date(), sentTo: subscribers.length },
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