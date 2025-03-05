import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { APIError } from '../utils/errors';
import dotenv from 'dotenv';
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
    
      // Process in batches
      const batchSize = 5;
      let sentCount = 0;
      
      for (let i = 0; i < uniqueSubscribers.length; i += batchSize) {
        const batch = uniqueSubscribers.slice(i, i + batchSize);
        logger.info(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(uniqueSubscribers.length/batchSize)}`);
        
        const emailPromises = batch.map(subscriber => {
          return this.transporter.sendMail({
            from: userSettings?.email?.fromName 
              ? `"${userSettings.email.fromName}" <${process.env.EMAIL_USER}>`
              : process.env.EMAIL_USER,
            replyTo: userSettings?.email?.replyTo || process.env.EMAIL_USER,
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
      
      logger.info(`Newsletter sent successfully to ${sentCount}/${uniqueSubscribers.length} subscribers`);
      return newsletter._id;
    } catch (error: any) {
      logger.error('Failed to send newsletter:', error.message);
      throw new APIError(500, `Failed to send newsletter: ${error.message}`);
    }
  }

  private generateNewsletterHTML(newsletter: any, subscriber: any): string {
    const unsubscribeToken = Buffer.from(subscriber._id.toString()).toString('base64');
    const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
    const unsubscribeUrl = `${serverUrl}/api/subscribers/unsubscribe/${unsubscribeToken}`;
    logger.info('Unsubscribe URL:', unsubscribeUrl);
    
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