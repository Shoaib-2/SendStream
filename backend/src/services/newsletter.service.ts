import Newsletter from '../models/Newsletter';
import Subscriber from '../models/Subscriber';
import Analytics from '../models/analytics';
import Settings from '../models/Settings';
import { ValidationError, NotFoundError } from '../utils/customErrors';
import { logger } from '../utils/logger';
import { emailService } from './email.service';
import { cronService } from './cron.service';

interface ContentQuality {
  isOriginalContent: boolean;
  hasResearchBacked: boolean;
  hasActionableInsights: boolean;
  contentLength: number;
  sources: string[];
  keyTakeaways: string[];
  qualityScore: number;
}

interface NewsletterData {
  title: string;
  subject: string;
  content: string;
  contentQuality?: Partial<ContentQuality>;
}

export class NewsletterService {
  /**
   * Create content quality object with defaults
   */
  private createContentQuality(data: NewsletterData): ContentQuality {
    return {
      isOriginalContent: data.contentQuality?.isOriginalContent || false,
      hasResearchBacked: data.contentQuality?.hasResearchBacked || false,
      hasActionableInsights: data.contentQuality?.hasActionableInsights || false,
      contentLength: data.content?.length || 0,
      sources: data.contentQuality?.sources || [],
      keyTakeaways: data.contentQuality?.keyTakeaways || [],
      qualityScore: 0
    };
  }

  /**
   * Create a new newsletter
   */
  async createNewsletter(data: NewsletterData, userId: string): Promise<any> {
    const contentQuality = this.createContentQuality(data);

    const newsletter = await Newsletter.create({
      ...data,
      createdBy: userId,
      contentQuality
    });

    return newsletter;
  }

  /**
   * Get newsletter statistics for user
   */
  async getNewsletterStats(userId: string): Promise<{ newsletters: any[]; qualityStats: any }> {
    const newsletters = await Newsletter.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .lean();

    const qualityStats = {
      averageScore: 0,
      topPerformers: [] as any[],
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

    return { newsletters, qualityStats };
  }

  /**
   * Get all newsletters for user
   */
  async getAllNewsletters(userId: string): Promise<any[]> {
    const newsletters = await Newsletter.find({
      createdBy: userId,
      $or: [
        { status: "draft" },
        { status: "scheduled" },
        {
          status: "sent",
          sentDate: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      ],
    }).sort("-createdAt");

    return newsletters.map((newsletter) => ({
      ...newsletter.toObject(),
      sent: newsletter.sentTo || 0,
      contentQuality: newsletter.contentQuality
    }));
  }

  /**
   * Get single newsletter by ID
   */
  async getNewsletterById(newsletterId: string, userId: string): Promise<any> {
    const newsletter = await Newsletter.findOne({
      _id: newsletterId,
      createdBy: userId,
    });

    if (!newsletter) {
      throw new NotFoundError('Newsletter not found');
    }

    return newsletter;
  }

  /**
   * Update newsletter
   */
  async updateNewsletter(newsletterId: string, data: Partial<NewsletterData>): Promise<any> {
    const newsletter = await Newsletter.findById(newsletterId);
    
    if (!newsletter) {
      throw new NotFoundError('Newsletter not found');
    }
    
    if (newsletter.status === 'sent') {
      throw new ValidationError('Cannot update sent newsletter');
    }

    const contentQuality = {
      isOriginalContent: data.contentQuality?.isOriginalContent ?? newsletter.contentQuality.isOriginalContent,
      hasResearchBacked: data.contentQuality?.hasResearchBacked ?? newsletter.contentQuality.hasResearchBacked,
      hasActionableInsights: data.contentQuality?.hasActionableInsights ?? newsletter.contentQuality.hasActionableInsights,
      contentLength: data.content?.length || newsletter.contentQuality.contentLength,
      sources: data.contentQuality?.sources ?? newsletter.contentQuality.sources,
      keyTakeaways: data.contentQuality?.keyTakeaways ?? newsletter.contentQuality.keyTakeaways,
      qualityScore: 0
    };

    const updatedNewsletter = await Newsletter.findByIdAndUpdate(
      newsletterId,
      { ...data, contentQuality },
      { new: true, runValidators: true }
    );

    updatedNewsletter?.calculateQualityScore();
    await updatedNewsletter?.save();

    return updatedNewsletter;
  }

  /**
   * Schedule newsletter for future sending
   */
  async scheduleNewsletter(newsletterId: string, scheduledDate: string, userId: string): Promise<any> {
    const scheduleTime = new Date(parseInt(scheduledDate));
    const now = new Date();

    if (scheduleTime.getTime() <= now.getTime() + 30000) {
      throw new ValidationError('Scheduled date must be at least 30 seconds in the future');
    }

    const newsletter = await Newsletter.findById(newsletterId);
    if (!newsletter) {
      throw new NotFoundError('Newsletter not found');
    }

    if (newsletter.createdBy.toString() !== userId.toString()) {
      throw new ValidationError('Not authorized to modify this newsletter');
    }

    const subscribers = await Subscriber.find({
      status: "active",
      createdBy: userId,
    });

    const updatedNewsletter = await Newsletter.findByIdAndUpdate(
      newsletterId,
      {
        status: 'scheduled',
        scheduledDate: scheduleTime,
        sentTo: subscribers.length
      },
      { new: true, runValidators: true }
    );

    await cronService.scheduleNewsletter(newsletterId, scheduleTime);

    return updatedNewsletter;
  }

  /**
   * Delete newsletter
   */
  async deleteNewsletter(newsletterId: string): Promise<void> {
    const newsletter = await Newsletter.findById(newsletterId);

    if (!newsletter) {
      throw new NotFoundError('Newsletter not found');
    }

    if (newsletter.status === 'sent') {
      throw new ValidationError('Cannot delete sent newsletter');
    }

    await newsletter.deleteOne();
  }

  /**
   * Validate email configuration
   */
  private validateEmailConfiguration(userSettings: any): { isValid: boolean; error?: string } {
    if (!userSettings || !userSettings.email) {
      return { isValid: false, error: "Email settings not found. Please configure your email settings." };
    }

    const { email } = userSettings;

    if (!email.fromName || email.fromName.trim() === '') {
      return { isValid: false, error: "From Name is required. Please set your sender name in email settings." };
    }

    if (!email.senderEmail || email.senderEmail.trim() === '') {
      return { isValid: false, error: "Sender Email is required. Please set your sender email in email settings." };
    }

    if (!email.replyTo || email.replyTo.trim() === '') {
      return { isValid: false, error: "Reply-To email is required. Please configure your reply-to email in settings." };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.senderEmail)) {
      return { isValid: false, error: "Sender email format is invalid. Please provide a valid email address." };
    }

    if (!emailRegex.test(email.replyTo)) {
      return { isValid: false, error: "Reply-To email format is invalid. Please provide a valid email address." };
    }

    const missingVars = [];
    if (!process.env.EMAIL_HOST) missingVars.push('EMAIL_HOST');
    if (!process.env.EMAIL_PORT) missingVars.push('EMAIL_PORT');
    if (!process.env.EMAIL_USER) missingVars.push('EMAIL_USER');
    if (!process.env.EMAIL_PASSWORD) missingVars.push('EMAIL_PASSWORD');

    if (missingVars.length > 0) {
      logger.error('Missing SMTP environment variables:', missingVars);
      return { isValid: false, error: "SMTP configuration is incomplete. Please contact administrator." };
    }

    return { isValid: true };
  }

  /**
   * Ensure user settings exist with defaults
   */
  private async ensureUserSettings(userId: string): Promise<any> {
    let userSettings = await Settings.findOne({ userId });
    
    if (!userSettings) {
      logger.info('Creating default settings for user:', userId);
      
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

  /**
   * Send newsletter immediately
   */
  async sendNewsletter(newsletterId: string, userId: string): Promise<{ newsletter: any; message: string }> {
    logger.info('=== NEWSLETTER SEND DEBUG START ===');
    logger.info('User ID:', userId);
    logger.info('Newsletter ID:', newsletterId);

    const newsletter = await Newsletter.findOne({
      _id: newsletterId,
      createdBy: userId
    });

    if (!newsletter) {
      logger.error('Newsletter not found');
      throw new NotFoundError('Newsletter not found');
    }

    logger.info('Newsletter found:', {
      id: newsletter._id,
      title: newsletter.title,
      status: newsletter.status
    });

    const subscribers = await Subscriber.find({
      status: "active",
      createdBy: userId,
    });

    logger.info('Subscriber query results:', {
      count: subscribers.length,
      userID: userId,
      subscriberEmails: subscribers.map(s => ({ email: s.email, status: s.status }))
    });

    if (!subscribers || subscribers.length === 0) {
      logger.warn('No active subscribers found to send newsletter to');
      throw new ValidationError('No active subscribers to send newsletter to');
    }

    logger.info(`Found ${subscribers.length} active subscribers`);

    const userSettings = await this.ensureUserSettings(userId);
    
    logger.info('User settings after ensuring defaults:', {
      found: !!userSettings,
      hasEmail: !!userSettings.email,
      fromName: userSettings.email?.fromName,
      replyTo: userSettings.email?.replyTo,
      senderEmail: userSettings.email?.senderEmail,
    });

    const validation = this.validateEmailConfiguration(userSettings);
    if (!validation.isValid) {
      logger.error('Email configuration validation failed:', validation.error);
      throw new ValidationError(validation.error!);
    }

    logger.info('Email configuration validation passed');

    const smtpConfig = {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD,
    };

    logger.info('SMTP Configuration:', smtpConfig);

    if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.hasPassword) {
      logger.error('SMTP environment variables missing');
      throw new ValidationError('Email server configuration is incomplete. Please contact administrator.');
    }

    logger.info('About to call emailService.sendNewsletter with validated settings');

    try {
      await emailService.sendNewsletter(newsletter, subscribers, userSettings);
      
      logger.info('Email service completed successfully');
      
      newsletter.status = "sent";
      newsletter.sentDate = new Date();
      newsletter.sentTo = subscribers.length;
      await newsletter.save();

      logger.info('Newsletter status updated to sent');

      await Analytics.create({
        newsletterId: newsletter._id,
        createdBy: userId,
        unsubscribes: { count: 0, details: [] }
      });

      logger.info('Analytics record created');

      await Newsletter.deleteOne({
        title: newsletter.title,
        status: "draft",
        createdBy: userId,
        _id: { $ne: newsletter._id }
      });

      logger.info('Draft cleanup completed');
      logger.info('=== NEWSLETTER SEND DEBUG END - SUCCESS ===');

      return { 
        newsletter,
        message: `Newsletter sent successfully to ${subscribers.length} subscribers`
      };
    } catch (sendError: unknown) {
      const errorMessage = sendError instanceof Error ? sendError.message : 'Unknown error occurred';
      const errorStack = sendError instanceof Error ? sendError.stack : undefined;
      
      logger.error("Email service failed:", { 
        error: errorMessage,
        stack: errorStack,
        newsletter: newsletter._id,
        subscriberCount: subscribers.length,
      });
      logger.info('=== NEWSLETTER SEND DEBUG END - EMAIL SERVICE ERROR ===');
      
      if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
        throw new ValidationError('Unable to connect to email server. Please check your internet connection or contact administrator.');
      } else if (errorMessage.includes('Invalid login') || errorMessage.includes('Authentication failed')) {
        throw new ValidationError('Email authentication failed. Please check email server credentials.');
      } else if (errorMessage.includes('recipients')) {
        throw new ValidationError('Failed to send to recipients. Please check subscriber email addresses and try again.');
      } else {
        throw new ValidationError(`Failed to send newsletter: ${errorMessage}`);
      }
    }
  }

  /**
   * Send scheduled newsletter (used by cron service)
   */
  async sendScheduledNewsletter(newsletterId: string): Promise<any> {
    try {
      const newsletter = await Newsletter.findById(newsletterId);
      if (!newsletter) return null;

      const subscribers = await Subscriber.find({
        status: "active",
        createdBy: newsletter.createdBy,
      });

      const userSettings = await this.ensureUserSettings(newsletter.createdBy.toString());
      
      const validation = this.validateEmailConfiguration(userSettings);
      if (!validation.isValid) {
        logger.error('Scheduled newsletter failed - invalid email configuration:', validation.error);
        return null;
      }

      await emailService.sendNewsletter(newsletter, subscribers, userSettings);
      
      const updatedNewsletter = await Newsletter.findByIdAndUpdate(
        newsletterId,
        { status: "sent", sentDate: new Date(), sentTo: subscribers.length },
        { new: true }
      );

      return updatedNewsletter;
    } catch (error) {
      logger.error("Failed to send scheduled newsletter:", error);
      return null;
    }
  }
}

export const newsletterService = new NewsletterService();
