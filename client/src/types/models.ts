// Data model types for frontend
export interface Newsletter {
  id: string;
  _id?: string;
  title: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  sentTo?: number;
  scheduledDate?: string | Date;
  sentDate?: string | Date;
  createdBy: string;
  contentQuality?: ContentQuality;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ContentQuality {
  isOriginalContent: boolean;
  hasResearchBacked: boolean;
  hasActionableInsights: boolean;
  contentLength: number;
  sources: string[];
  keyTakeaways: string[];
  qualityScore: number;
}

export interface Subscriber {
  id: string;
  _id?: string;
  email: string;
  name: string;
  status: 'active' | 'unsubscribed';
  subscribed: string | Date;
  subscribedDate?: string | Date;
  source?: 'mailchimp' | 'csv' | 'manual';
  createdBy?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Analytics {
  newsletterId: string;
  opens: {
    count: number;
    details: Array<{
      subscriberId: string;
      timestamp: Date | string;
    }>;
  };
  clicks: {
    count: number;
    details: Array<{
      subscriberId: string;
      url: string;
      timestamp: Date | string;
    }>;
  };
  bounces: {
    count: number;
    details: Array<{
      subscriberId: string;
      reason: string;
      timestamp: Date | string;
    }>;
  };
  unsubscribes: {
    count: number;
    details: Array<{
      subscriberId: string;
      reason?: string;
      timestamp: Date | string;
    }>;
  };
}

export interface Settings {
  email: {
    fromName: string;
    replyTo: string;
    senderEmail: string;
  };
  mailchimp?: {
    apiKey: string;
    serverPrefix: string;
    enabled: boolean;
    listId?: string;
    autoSync: boolean;
  };
}

export interface DashboardSummary {
  subscribers: {
    total: number;
    change: number;
  };
  newsletters: {
    total: number;
    change: number;
  };
  openRate: {
    rate: number;
    change: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string | Date;
  }>;
}

export interface GrowthData {
  date: string;
  subscribers: number;
  newsletters: number;
}

export interface NewsletterStats {
  newsletters: Newsletter[];
  qualityStats: {
    averageScore: number;
    topPerformers: Newsletter[];
    qualityDistribution: {
      high: number;
      medium: number;
      low: number;
    };
  };
}
