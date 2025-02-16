// services/integrations/mailchimp.ts
import axios from 'axios';


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
    this.client = axios.create({
      baseURL: `https://${serverPrefix}.api.mailchimp.com/3.0`,
      headers: {
        'Authorization': `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async initializeList() {
    const response = await this.client.get('/lists');
    this.listId = response.data.lists[0].id;
    return this.listId;
  }

  async getSubscriberStats() {
    const response = await this.client.get(`/lists/${this.listId}/`);
    return {
      memberCount: response.data.stats.member_count,
      unsubscribeCount: response.data.stats.unsubscribe_count,
      cleanedCount: response.data.stats.cleaned_count
    };
  }

  async addSubscribers(subscribers: Array<{ email: string; name: string }>) {
    const operations = subscribers.map(sub => ({
      method: 'POST',
      path: `/lists/${this.listId}/members`,
      body: {
        email_address: sub.email,
        status: 'subscribed',
        merge_fields: { FNAME: sub.name }
      }
    }));

    return this.client.post('/batches', { operations });
  }

  async sendNewsletter(newsletter: { subject: string; content: string }) {
    const campaign = await this.createCampaign(newsletter.subject);
    await this.setCampaignContent(campaign.id, newsletter.content);
    return this.sendCampaign(campaign.id);
  }

  private async createCampaign(subject: string) {
    const response = await this.client.post('/campaigns', {
      type: 'regular',
      recipients: { list_id: this.listId },
      settings: {
        subject_line: subject,
        from_name: 'Your Newsletter',
        reply_to: 'newsletter@yourdomain.com'
      }
    });
    return response.data;
  }

  private async setCampaignContent(campaignId: string, content: string) {
    return this.client.put(`/campaigns/${campaignId}/content`, {
      html: content
    });
  }

  private async sendCampaign(campaignId: string) {
    return this.client.post(`/campaigns/${campaignId}/actions/send`);
  }

  async syncSubscribers() {
    try {
      const response = await this.client.get(`/lists/${this.listId}/members`, {
        params: {
          count: 1000,
          fields: 'members.email_address,members.merge_fields,members.status'
        }
      });
  
      return response.data.members.map((member: MailchimpMember) => ({
        email: member.email_address,
        name: member.merge_fields.FNAME || '',
        status: member.status === 'subscribed' ? 'active' : 'unsubscribed',
        subscribedDate: member.timestamp_signup
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error('Failed to sync subscribers: ' + errorMessage);
    }
  }

  async getCampaignStats(campaignId: string) {
    const response = await this.client.get(`/campaigns/${campaignId}/content`);
    return {
      opens: response.data.opens,
      clicks: response.data.clicks,
      unsubscribes: response.data.unsubscribes
    };
  }

  async scheduleNewsletter(campaignId: string, sendTime: Date) {
    return this.client.post(`/campaigns/${campaignId}/actions/schedule`, {
      schedule_time: sendTime.toISOString()
    });
  }

  async unscheduleNewsletter(campaignId: string) {
    return this.client.post(`/campaigns/${campaignId}/actions/unschedule`);
  }
  
  async testConnection() {
    try {
      console.log('🔍 Testing Mailchimp connection...');
      const response = await this.client.get('/lists');
      console.log('✅ Connection successful');
      console.log('📊 Lists found:', response.data.total_items);
      console.log('📝 First list details:', {
        name: response.data.lists[0].name,
        id: response.data.lists[0].id,
        memberCount: response.data.lists[0].stats.member_count
      });
      
      return {
        success: true,
        message: `Connected to Mailchimp. Found ${response.data.total_items} list(s)`,
        listId: response.data.lists[0].id
      };
    } catch (error: any) {
      console.error('❌ Connection failed:', error.response?.data || error.message);
      return {
        success: false,
        message: 'Connection failed: ' + error.message
      };
    }
  }
}