import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { APIError } from '../utils/errors';
import dotenv from 'dotenv';
import { error } from 'winston';
dotenv.config();

interface newsletter {
  _id: string;
  subject: string;
  content: string;
}

interface subscribers {
  _id: string;
  email: string;
}

/**
 * EmailService class handles all email-related operations
 * Supports multiple email providers and templating
 */
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      },
    });
  }

  /**
   * Initialize email providers (Mailchimp)
   */
  async initializeProviders() {
    try {
      console.log('SMTP Config:', {
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        user: process.env.EMAIL_USER
      });
      
      // Only verify the connection
      await this.transporter.verify();
    } catch (error) {
      console.error('Detailed SMTP Error:', error);
      throw error;
    }
  }

  /**
   * Send a newsletter to a list of subscribers
   */
  async sendNewsletter(newsletter: any, subscribers: any[]) {
    try {
      // Ensure unique subscribers by email
      const uniqueSubscribers = Array.from(
        new Map(subscribers.map(s => [s.email, s])).values()
      );
      logger.info(`Sending newsletter to ${uniqueSubscribers.length} unique subscribers`);
    
      const emailPromises = uniqueSubscribers.map(async (subscriber) => {
        try {
          const info = await this.transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: subscriber.email,
            subject: newsletter.subject,
            html: this.generateNewsletterHTML(newsletter, subscriber)
          });
          console.log(`Email sent to ${subscriber.email}:`, info.response);
          return info;
        } catch (emailError) {
          logger.error('Failed to send newsletter', { newsletter: newsletter._id, error });
          return null;
        }
      });
  
      await Promise.all(emailPromises);
      return newsletter._id;
    } catch (error) {
      logger.error('Overall newsletter send failed:', error);
      throw new APIError(500, 'Failed to send newsletter');
    }
  }

  /**
   * Generate HTML content for newsletter
   */
  private generateNewsletterHTML(newsletter: any, subscriber: any): string {
    const unsubscribeToken = Buffer.from(subscriber._id.toString()).toString('base64');
    const unsubscribeUrl = `${process.env.SERVER_URL}/api/subscribers/unsubscribe/${unsubscribeToken}`;
    console.log('ngrox url', unsubscribeUrl);
    
    const uniqueToken = Buffer.from(`${newsletter._id}-${subscriber._id}-${Date.now()}`).toString('base64');
    const trackingPixelUrl = `${process.env.SERVER_URL}/api/analytics/track-open/${newsletter._id.toString()}/${subscriber._id.toString()}?token=${uniqueToken}&v=${Math.random()}`;
    
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
