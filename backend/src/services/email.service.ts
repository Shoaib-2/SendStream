import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { APIError } from '../utils/errors';
import dotenv from 'dotenv';
import EmailUsageModel from '../models/EmailUsage';
import mongoose from 'mongoose';
dotenv.config();

interface MailOptions {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private DEFAULT_DAILY_LIMIT = 100; // Default sending limit per day

  constructor() {
    // Configure Gmail transporter
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    logger.info('Gmail transporter created');
  }

  async initializeProviders() {
    try {
      logger.info('Verifying SMTP connection...');
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
    } catch (error) {
      logger.error('SMTP verification failed:', error);
      throw error;
    }
  }

  // Check if a user has reached their email sending limit
  async checkEmailLimit(userId: string, count: number): Promise<boolean> {
    if (!userId) {
      logger.warn('No userId provided for email limit check');
      return true; // Allow sending without tracking if no user ID
    }
    
    try {
      // Get today's date (midnight)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find or create usage record for today
      let usage = await EmailUsageModel.findOne({
        userId: new mongoose.Types.ObjectId(userId),
        date: today
      });
      
      if (!usage) {
        // No record for today, create one
        usage = new EmailUsageModel({
          userId: new mongoose.Types.ObjectId(userId),
          date: today,
          emailsSent: 0,
          lastUpdated: new Date()
        });
      }
      
      // Check if sending these emails would exceed the limit
      if (usage.emailsSent + count > this.DEFAULT_DAILY_LIMIT) {
        logger.warn(`Email limit reached for user ${userId}: ${usage.emailsSent}/${this.DEFAULT_DAILY_LIMIT}`);
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Error checking email limit:', error);
      return true; // Allow sending if the check fails
    }
  }

  // Update email usage after successful sending
  async updateEmailUsage(userId: string, count: number): Promise<void> {
    if (!userId) {
      logger.warn('No userId provided for email usage update');
      return;
    }
    
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Use findOneAndUpdate with upsert to create if not exists
      const result = await EmailUsageModel.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId(userId), date: today },
        { $inc: { emailsSent: count }, $set: { lastUpdated: new Date() } },
        { upsert: true, new: true }
      );
      
      logger.info(`Updated email usage for user ${userId}: ${result.emailsSent}/${this.DEFAULT_DAILY_LIMIT}`);
    } catch (error) {
      logger.error('Error updating email usage:', error);
    }
  }

  // Add a method to send custom emails
  async sendEmail(mailOptions: MailOptions): Promise<void> {
    try {
      logger.info(`Sending email to ${mailOptions.to}`);
      await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent successfully to ${mailOptions.to}`);
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw new APIError(500, `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendNewsletter(newsletter: any, subscribers: any[], userSettings: any) {
    try {
      // Ensure unique subscribers by email
      const uniqueSubscribers = Array.from(
        new Map(subscribers.map(s => [s.email, s])).values()
      );
      logger.info(`Sending newsletter to ${uniqueSubscribers.length} unique subscribers`);
      
      // Get user ID from newsletter or settings
      const userId = newsletter.createdBy?.toString() || userSettings?.userId?.toString();
      
      // Check if within daily sending limit
      const withinLimit = await this.checkEmailLimit(userId, uniqueSubscribers.length);
      if (!withinLimit) {
        throw new APIError(429, `Daily email sending limit reached (${this.DEFAULT_DAILY_LIMIT}). Please try again tomorrow.`);
      }
    
      // Process in batches
      const batchSize = 5;
      let sentCount = 0;
      
      for (let i = 0; i < uniqueSubscribers.length; i += batchSize) {
        const batch = uniqueSubscribers.slice(i, i + batchSize);
        logger.info(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(uniqueSubscribers.length/batchSize)}`);
        
        const emailPromises = batch.map(subscriber => {
          // Get sender information from settings
          const fromName = userSettings?.email?.fromName || 'Newsletter';
          
          // Format the from field with proper name and email
          const fromField = `"${fromName}" <${process.env.EMAIL_USER}>`;
          
          // Ensure replyTo is properly set
          const replyTo = userSettings?.email?.replyTo || process.env.EMAIL_USER;
          
          logger.info(`Sending with from: ${fromField}, replyTo: ${replyTo}`);
          
          return this.transporter.sendMail({
            from: fromField,
            replyTo: replyTo,
            to: subscriber.email,
            subject: newsletter.subject,
            html: this.generateNewsletterHTML(newsletter, subscriber)
          });
        });
        
        try {
          const results = await Promise.allSettled(emailPromises);
          const successful = results.filter(r => r.status === 'fulfilled').length;
          sentCount += successful;
          
          logger.info(`Batch results: ${successful}/${batch.length} emails sent`);
        } catch (batchError) {
          logger.error('Batch error:', batchError);
        }
      }
      
      if (sentCount === 0) {
        throw new Error('Failed to send newsletter to any recipients');
      }
      
      // Update usage tracking if emails were sent
      if (sentCount > 0 && userId) {
        await this.updateEmailUsage(userId, sentCount);
      }
      
      logger.info(`Newsletter sent successfully to ${sentCount}/${uniqueSubscribers.length} subscribers`);
      return newsletter._id;
    } catch (error: any) {
      logger.error('Failed to send newsletter:', error.message);
      throw new APIError(500, `Failed to send newsletter: ${error.message}`);
    }
  }

  private generateNewsletterHTML(newsletter: any, subscriber: any): string {
    const unsubscribeToken = Buffer.from(subscriber._id.toString()).toString('base64');
    
    // Use the frontend URL for unsubscribe
    const frontendUrl = process.env.CLIENT_URL;
    const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
    logger.info('Unsubscribe URL:', unsubscribeUrl);
    
    const serverUrl = process.env.SERVER_URL;
    const trackingPixelUrl = `${serverUrl}/api/analytics/track-open/${newsletter._id.toString()}/${subscriber._id.toString()}`;
    
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="img-src * 'self' data: https:;">
        <title>${newsletter.subject}</title>
        <style>
          body { 
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            line-height: 1.6;
            color: #334155;
            margin: 0;
            padding: 0;
            background-color: #f1f5f9;
            -webkit-font-smoothing: antialiased;
          }
          .wrapper {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            overflow: hidden;
          }
          .header {
            background-color: #0f172a;
            padding: 40px 24px;
            text-align: center;
            position: relative;
          }
          .header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(to right, #3b82f6, #2563eb);
          }
          .header h1 {
            color: #fff;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .content {
            padding: 48px 32px;
            font-size: 16px;
            color: #334155;
            line-height: 1.7;
          }
          .content p {
            margin: 0 0 16px;
          }
          .content a {
            color: #2563eb;
            text-decoration: none;
            border-bottom: 1px solid #bfdbfe;
            transition: border-color 0.2s;
          }
          .content a:hover {
            border-color: #2563eb;
          }
          /* Style for emoji icons */
          .emoji {
            font-size: 1.2em;
            margin-right: 4px;
            vertical-align: middle;
          }
          /* Style for important points */
          .highlight {
            background-color: #f0f9ff;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
          /* Section separators */
          .divider {
            height: 1px;
            background-color: #e2e8f0;
            margin: 24px 0;
          }
          /* Better blockquotes */
          blockquote {
            background-color: #f8fafc;
            border-left: 4px solid #94a3b8;
            padding: 16px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
            font-style: italic;
          }
          /* List styling */
          ul, ol {
            padding-left: 24px;
            margin-bottom: 20px;
          }
          li {
            margin-bottom: 8px;
          }
          .footer {
            background-color: #f8fafc;
            padding: 32px 24px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            color: #64748b;
            font-size: 14px;
            margin: 0 0 16px;
          }
          .unsubscribe {
            display: inline-block;
            color: #64748b;
            font-size: 13px;
            text-decoration: none;
            padding: 6px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            transition: all 0.2s;
          }
          .unsubscribe:hover {
            background-color: #f8fafc;
            border-color: #cbd5e1;
            color: #475569;
          }
          /* Added spacing and better formatting for headings within content */
          .content h2 {
            margin-top: 32px;
            margin-bottom: 16px;
            color: #1e293b;
          }
          .content h3 {
            margin-top: 24px;
            margin-bottom: 12px;
            color: #334155;
          }
          @media only screen and (max-width: 480px) {
            .wrapper {
              padding: 12px;
            }
            .container {
              border-radius: 8px;
            }
            .content {
              padding: 32px 24px;
            }
            .header {
              padding: 32px 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <h1>${newsletter.subject}</h1>
            </div>
            <div class="content">
              ${newsletter.content}
            </div>
            <div class="footer">
              <p>You're receiving this email because you subscribed to our newsletter.</p>
              <a href="${unsubscribeUrl}" class="unsubscribe">Unsubscribe</a>
            </div>
          </div>
        </div>
        <img src="${trackingPixelUrl}" 
             width="1" 
             height="1" 
             alt="" 
             style="display:none !important;" 
             loading="eager"
             referrerpolicy="no-referrer-when-downgrade"
             importance="high"
             fetchpriority="high">
      </body>
    </html>
  `;
  }
}

export const emailService = new EmailService();