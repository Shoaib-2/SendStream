// backend/src/services/email.service.ts
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { APIError } from '../utils/errors';

/**
 * EmailService class handles all email-related operations
 * Supports multiple email providers and templating
 */
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  /**
   * Initialize email providers (Mailchimp/Substack)
   */
  async initializeProviders() {
    try {
      // Verify SMTP connection
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Email service initialization failed:', error);
      throw new APIError(500, 'Email service initialization failed');
    }
  }

  /**
   * Send a newsletter to a list of subscribers
   */
  async sendNewsletter(newsletter: any, subscribers: any[]) {
    try {
      const emailPromises = subscribers.map(subscriber => 
        this.transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: subscriber.email,
          subject: newsletter.subject,
          html: this.generateNewsletterHTML(newsletter, subscriber),
          headers: {
            'X-Newsletter-ID': newsletter._id.toString(),
            'X-Subscriber-ID': subscriber._id.toString()
          }
        })
      );

      await Promise.all(emailPromises);
      logger.info(`Newsletter sent to ${subscribers.length} subscribers`);
    } catch (error) {
      logger.error('Failed to send newsletter:', error);
      throw new APIError(500, 'Failed to send newsletter');
    }
  }

  /**
   * Generate HTML content for newsletter
   */
  private generateNewsletterHTML(newsletter: any, subscriber: any): string {
    const unsubscribeUrl = `${process.env.CLIENT_URL}/unsubscribe?token=${subscriber._id}`;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${newsletter.subject}</title>
        </head>
        <body>
          <div class="newsletter-content">
            ${newsletter.content}
          </div>
          <div class="footer">
            <p>
              You're receiving this email because you subscribed to our newsletter.
              <a href="${unsubscribeUrl}">Unsubscribe here</a>
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Send a test email
   */
  async sendTestEmail(to: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject: 'Test Email',
        html: '<h1>Test Email</h1><p>This is a test email from the newsletter service.</p>'
      });
      logger.info(`Test email sent to ${to}`);
    } catch (error) {
      logger.error('Failed to send test email:', error);
      throw new APIError(500, 'Failed to send test email');
    }
  }
}

export const emailService = new EmailService();