import sgMail from '@sendgrid/mail';
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
  private DEFAULT_DAILY_LIMIT = 100; // Default sending limit per day (SendGrid free tier)
  private isInitialized = false;

  constructor() {
    try {
      const apiKey = process.env.SENDGRID_API_KEY;
      
      if (!apiKey) {
        throw new Error('SENDGRID_API_KEY environment variable is not set');
      }
      
      // Log API key info (first 10 chars for debugging, never log full key in production)
      const maskedKey = apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
      logger.info(`SendGrid API Key loaded: ${maskedKey} (length: ${apiKey.length})`);
      
      // Initialize SendGrid
      sgMail.setApiKey(apiKey);
      this.isInitialized = true;
      
      logger.info('SendGrid initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize SendGrid:', error);
      this.isInitialized = false;
      throw new APIError(500, 'Email service initialization failed');
    }
  }

  async initializeProviders() {
    try {
      if (!this.isInitialized) {
        throw new Error('SendGrid is not initialized');
      }
      
      logger.info('SendGrid email service ready');
      
      // Verify the API key is valid by checking if it's set
      if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY.length < 20) {
        throw new Error('Invalid SendGrid API key');
      }
      
      logger.info('SendGrid configuration verified successfully');
    } catch (error) {
      logger.error('SendGrid verification failed:', error);
      throw new APIError(500, 'Email service verification failed');
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
      if (!this.isInitialized) {
        throw new Error('SendGrid is not initialized');
      }
      
      logger.info(`Sending email via SendGrid to ${mailOptions.to}`);
      
      const msg = {
        to: mailOptions.to,
        from: mailOptions.from,
        subject: mailOptions.subject,
        html: mailOptions.html,
        ...(mailOptions.replyTo && { replyTo: mailOptions.replyTo })
      };
      
      await sgMail.send(msg);
      logger.info(`Email sent successfully via SendGrid to ${mailOptions.to}`);
    } catch (error: any) {
      logger.error('SendGrid email send failed:', {
        message: error.message,
        code: error.code,
        response: error.response?.body
      });
      
      const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Unknown error';
      throw new APIError(500, `Failed to send email: ${errorMessage}`);
    }
  }

  async sendNewsletter(newsletter: any, subscribers: any[], userSettings: any) {
    try {
      if (!this.isInitialized) {
        throw new APIError(500, 'Email service is not initialized');
      }
      
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
    
      // Process in batches (SendGrid allows up to 1000 recipients per API call, but we'll use smaller batches)
      const batchSize = 5;
      let sentCount = 0;
      const failedEmails: string[] = [];
      
      for (let i = 0; i < uniqueSubscribers.length; i += batchSize) {
        const batch = uniqueSubscribers.slice(i, i + batchSize);
        logger.info(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(uniqueSubscribers.length/batchSize)}`);
        
        const emailPromises = batch.map(async (subscriber) => {
          try {
            // Get sender information from settings
            const fromName = userSettings?.email?.fromName || 'Newsletter';
            const fromEmail = process.env.EMAIL_USER;
            
            if (!fromEmail) {
              throw new Error('EMAIL_USER environment variable is not set');
            }
            
            // Format the from field with proper name and email
            const fromField = `${fromName} <${fromEmail}>`;
            
            // Ensure replyTo is properly set
            const replyTo = userSettings?.email?.replyTo || fromEmail;
            
            logger.info(`Sending via SendGrid - From: ${fromField}, ReplyTo: ${replyTo}, To: ${subscriber.email}`);
            
            const msg = {
              to: subscriber.email,
              from: fromEmail, // SendGrid requires verified sender
              subject: newsletter.subject,
              html: this.generateNewsletterHTML(newsletter, subscriber),
              replyTo: replyTo
            };
            
            await sgMail.send(msg);
            return { success: true, email: subscriber.email };
          } catch (error: any) {
            // Enhanced error logging for SendGrid
            const errorDetails = {
              message: error.message,
              code: error.code,
              statusCode: error.response?.statusCode,
              body: error.response?.body,
              headers: error.response?.headers
            };
            
            logger.error(`Failed to send to ${subscriber.email}:`, JSON.stringify(errorDetails, null, 2));
            return { success: false, email: subscriber.email, error: error.message };
          }
        });
        
        try {
          const results = await Promise.allSettled(emailPromises);
          
          results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
              sentCount++;
              logger.info(`✓ Email sent successfully to ${result.value.email}`);
            } else if (result.status === 'fulfilled' && !result.value.success) {
              failedEmails.push(result.value.email);
              logger.error(`✗ Email failed for ${result.value.email}: ${result.value.error}`);
            } else if (result.status === 'rejected') {
              logger.error(`✗ Promise rejected for email ${index + 1}:`, result.reason);
            }
          });
          
          logger.info(`Batch results: ${sentCount}/${batch.length} emails sent successfully`);
        } catch (batchError: any) {
          logger.error('Batch processing error:', {
            message: batchError.message,
            stack: batchError.stack
          });
        }
        
        // Small delay between batches to avoid rate limiting
        if (i + batchSize < uniqueSubscribers.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (sentCount === 0) {
        throw new APIError(500, 'Failed to send newsletter to any recipients. Please check your SendGrid configuration and sender verification.');
      }
      
      // Update usage tracking if emails were sent
      if (sentCount > 0 && userId) {
        try {
          await this.updateEmailUsage(userId, sentCount);
        } catch (usageError: any) {
          logger.error('Failed to update email usage:', usageError.message);
          // Don't fail the entire operation if usage tracking fails
        }
      }
      
      logger.info(`Newsletter sent successfully: ${sentCount}/${uniqueSubscribers.length} emails delivered`);
      
      if (failedEmails.length > 0) {
        logger.warn(`Failed to send to ${failedEmails.length} recipients:`, failedEmails);
      }
      
      return newsletter._id;
    } catch (error: any) {
      logger.error('Newsletter send operation failed:', {
        message: error.message,
        stack: error.stack
      });
      
      if (error instanceof APIError) {
        throw error;
      }
      
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