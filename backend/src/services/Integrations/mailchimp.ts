// services/integrations/mailchimp.ts
import axios from 'axios';
import { withRetry } from '../../utils/retry';
import { mailchimpRateLimiter } from '../../utils/rateLimiter';
import { 
  validateApiResponse, 
  validateListResponse, 
  validateCampaignResponse, 
  validateMemberResponse
} from '../../utils/validation';
import { logger } from '../../utils/logger';

interface MailchimpMember {
  email_address: string;
  merge_fields: {
    FNAME?: string;
  };
  status: string;
  timestamp_signup: string;
}

export class MailchimpService {
  private client;
  private listId!: string;

  constructor(apiKey: string, serverPrefix: string) {
    // Trim whitespace from server prefix to prevent URL errors
    const cleanServerPrefix = serverPrefix.trim();
    this.client = axios.create({
      baseURL: `https://${cleanServerPrefix}.api.mailchimp.com/3.0`,
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async initializeList() {
    return withRetry(async () => {
      const response = await mailchimpRateLimiter.withRateLimit(() => 
        this.client.get('/lists')
      );
      
      const validatedResponse = validateApiResponse(
        response.data,
        validateListResponse,
        'initialize list'
      );

      if (validatedResponse.lists.length === 0) {
        throw new Error('No Mailchimp lists found');
      }

      this.listId = validatedResponse.lists[0].id;
      return this.listId;
    });
  }

  async getSubscriberStats() {
    return withRetry(async () => {
      const response = await mailchimpRateLimiter.withRateLimit(() => 
        this.client.get(`/lists/${this.listId}/`)
      );
      
      const validatedResponse = validateApiResponse(
        response.data,
        validateListResponse,
        'subscriber stats'
      );

      return {
        memberCount: validatedResponse.lists[0].stats.member_count,
        unsubscribeCount: validatedResponse.lists[0].stats.unsubscribe_count,
        cleanedCount: validatedResponse.lists[0].stats.cleaned_count
      };
    });
  }

  async addSubscribers(subscribers: Array<{ email: string; name: string }>) {
    return withRetry(async () => {
      const operations = subscribers.map(sub => ({
        method: 'POST',
        path: `/lists/${this.listId}/members`,
        body: {
          email_address: sub.email,
          status: 'subscribed',
          merge_fields: { FNAME: sub.name }
        }
      }));

      logger.info(`Adding ${subscribers.length} subscribers to Mailchimp`);
      
      return mailchimpRateLimiter.withRateLimit(() => 
        this.client.post('/batches', { operations })
      );
    });
  }

  // New method: Update subscriber status in Mailchimp
  async updateSubscriberStatus(email: string, status: 'subscribed' | 'unsubscribed') {
    return withRetry(async () => {
      logger.info(`Updating status for ${email} to ${status} in Mailchimp`);
      
      // MD5 hash the email address for Mailchimp's member ID
      const emailMD5 = require('crypto').createHash('md5').update(email.toLowerCase()).digest('hex');
      
      try {
        // Use PATCH to update only the status field
        const response = await mailchimpRateLimiter.withRateLimit(() => 
          this.client.patch(`/lists/${this.listId}/members/${emailMD5}`, {
            status: status
          })
        );
        
        logger.info(`Successfully updated ${email} status to ${status}`);
        return response.data;
      } catch (error: any) {
        // If member not found, try to add with the correct status
        if (error.response?.status === 404) {
          logger.warn(`Member ${email} not found in Mailchimp, adding with status ${status}`);
          const response = await mailchimpRateLimiter.withRateLimit(() => 
            this.client.post(`/lists/${this.listId}/members`, {
              email_address: email,
              status: status
            })
          );
          return response.data;
        }
        throw error;
      }
    });
  }

  // New method: Get specific subscriber status from Mailchimp
  async getSubscriberStatus(email: string) {
    return withRetry(async () => {
      logger.info(`Checking status for ${email} in Mailchimp`);
      
      // MD5 hash the email address for Mailchimp's member ID
      const emailMD5 = require('crypto').createHash('md5').update(email.toLowerCase()).digest('hex');
      
      try {
        const response = await mailchimpRateLimiter.withRateLimit(() => 
          this.client.get(`/lists/${this.listId}/members/${emailMD5}`)
        );
        
        logger.info(`Current Mailchimp status for ${email}: ${response.data.status}`);
        return {
          status: response.data.status === 'subscribed' ? 'active' : 'unsubscribed',
          emailExists: true
        };
      } catch (error: any) {
        if (error.response?.status === 404) {
          logger.warn(`Member ${email} not found in Mailchimp`);
          return {
            status: 'unknown',
            emailExists: false
          };
        }
        throw error;
      }
    });
  }

 // Fix the error in mailchimp.ts


 async sendNewsletter(newsletter: { subject: string; content: string }) {
  try {
    logger.info('Preparing to send newsletter via Mailchimp');
    
    // Make sure we have API key and server prefix
    if (!this.client.defaults.baseURL || !this.client.defaults.headers.Authorization) {
      logger.error('Missing Mailchimp credentials');
      return { 
        success: false, 
        message: 'Missing Mailchimp credentials'
      };
    }
    
    // Initialize list if needed
    if (!this.listId) {
      try {
        logger.info('No list ID found, initializing...');
        await this.initializeList();
      } catch (listError: any) {
        logger.error('Failed to initialize list', { error: listError.message });
        return { 
          success: false, 
          message: `Failed to initialize Mailchimp list: ${listError.message}`
        };
      }
    }
    
    if (!this.listId) {
      logger.error('No Mailchimp list available');
      return { 
        success: false, 
        message: 'No Mailchimp list configured'
      };
    }
    
    // Create campaign with better error handling
    let campaign;
    try {
      logger.info('Creating Mailchimp campaign');
      campaign = await this.createCampaign(newsletter.subject);
      logger.info('Campaign created', { campaignId: campaign.id });
    } catch (campaignError: any) {
      logger.error('Failed to create campaign', { error: campaignError.message });
      return { 
        success: false, 
        message: `Failed to create Mailchimp campaign: ${campaignError.message}`
      };
    }
    
    // Set campaign content
    try {
      logger.info('Setting campaign content', { campaignId: campaign.id });
      await this.setCampaignContent(campaign.id, newsletter.content);
      logger.info('Campaign content set successfully');
    } catch (contentError: any) {
      logger.error('Failed to set campaign content', { error: contentError.message });
      return { 
        success: false, 
        message: `Failed to set campaign content: ${contentError.message}`
      };
    }
    
    // Send the campaign
    try {
      logger.info('Sending campaign', { campaignId: campaign.id });
      await this.sendCampaign(campaign.id);
      logger.info('Campaign sent successfully');
      return { 
        success: true, 
        message: 'Newsletter sent successfully via Mailchimp',
        campaignId: campaign.id 
      };
    } catch (sendError: any) {
      logger.error('Failed to send campaign', { 
        campaignId: campaign.id,
        error: sendError.message 
      });
      return { 
        success: false, 
        message: `Failed to send Mailchimp campaign: ${sendError.message}`,
        campaignId: campaign.id
      };
    }
  } catch (error: any) {
    logger.error('Unexpected error in sendNewsletter', { error });
    return { 
      success: false, 
      message: `Unexpected error: ${error.message}`
    };
  }
}

  private async createCampaign(subject: string) {
    const response = await mailchimpRateLimiter.withRateLimit(() => 
      this.client.post('/campaigns', {
        type: 'regular',
        recipients: { list_id: this.listId },
        settings: {
          subject_line: subject,
          from_name: 'Your Newsletter',
          reply_to: 'newsletter@yourdomain.com'
        }
      })
    );

    return validateApiResponse(
      response.data,
      validateCampaignResponse,
      'create campaign'
    );
  }

  private async setCampaignContent(campaignId: string, content: string) {
    return withRetry(async () => {
      return mailchimpRateLimiter.withRateLimit(() => 
        this.client.put(`/campaigns/${campaignId}/content`, {
          html: content
        })
      );
    });
  }

  private async sendCampaign(campaignId: string) {
    return withRetry(async () => {
      return mailchimpRateLimiter.withRateLimit(() => 
        this.client.post(`/campaigns/${campaignId}/actions/send`)
      );
    });
  }

  // Enhanced with better error handling and data validation
  async syncSubscribers() {
    return withRetry(async () => {
      logger.info('Starting subscriber sync with Mailchimp');
      const response = await mailchimpRateLimiter.withRateLimit(() => 
        this.client.get(`/lists/${this.listId}/members`, {
          params: {
            count: 1000,
            fields: 'members.email_address,members.merge_fields,members.status,members.timestamp_signup'
          }
        })
      );

      const validatedResponse = validateApiResponse(
        response.data,
        validateMemberResponse,
        'sync subscribers'
      );
      
      // Map Mailchimp statuses to our app statuses with careful validation
      const subscribers = validatedResponse.members.map((member: MailchimpMember) => ({
        email: member.email_address,
        name: member.merge_fields.FNAME || '',
        // Ensure status is properly mapped
        status: member.status === 'subscribed' ? 'active' : 'unsubscribed',
        subscribedDate: member.timestamp_signup || new Date().toISOString()
      }));
      
      logger.info(`Synced ${subscribers.length} subscribers from Mailchimp`);
      
      // Log statuses for debugging
      const activeCount = subscribers.filter(s => s.status === 'active').length;
      const unsubscribedCount = subscribers.filter(s => s.status === 'unsubscribed').length;
      logger.info(`Status breakdown - Active: ${activeCount}, Unsubscribed: ${unsubscribedCount}`);
      
      return subscribers;
    });
  }

  async getCampaignStats(campaignId: string) {
    return withRetry(async () => {
      const response = await mailchimpRateLimiter.withRateLimit(() => 
        this.client.get(`/campaigns/${campaignId}/content`)
      );

      return {
        opens: response.data.opens,
        clicks: response.data.clicks,
        unsubscribes: response.data.unsubscribes
      };
    });
  }

  async scheduleNewsletter(campaignId: string, sendTime: Date) {
    return withRetry(async () => {
      return mailchimpRateLimiter.withRateLimit(() => 
        this.client.post(`/campaigns/${campaignId}/actions/schedule`, {
          schedule_time: sendTime.toISOString()
        })
      );
    });
  }

  async unscheduleNewsletter(campaignId: string) {
    return withRetry(async () => {
      return mailchimpRateLimiter.withRateLimit(() => 
        this.client.post(`/campaigns/${campaignId}/actions/unschedule`)
      );
    });
  }
  
  async testConnection() {
    try {
      logger.info('🔍 Testing Mailchimp connection...');
      const response = await mailchimpRateLimiter.withRateLimit(() => 
        this.client.get('/lists')
      );

      const validatedResponse = validateApiResponse(
        response.data,
        validateListResponse,
        'test connection'
      );

      logger.info('✅ Connection successful');
      logger.info('📊 Lists found:', validatedResponse.total_items);
      
      if (validatedResponse.lists.length > 0) {
        logger.info('📝 First list details:', {
          name: validatedResponse.lists[0].name,
          id: validatedResponse.lists[0].id,
          memberCount: validatedResponse.lists[0].stats.member_count
        });
      }
      
      return {
        success: true,
        message: `Connected to Mailchimp. Found ${validatedResponse.total_items} list(s)`,
        listId: validatedResponse.lists[0]?.id
      };
    } catch (error: any) {
      logger.error('❌ Connection failed:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Connection failed: ' + error.message
      };
    }
  }
};