export interface PricingTier {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
}

export interface Subscriber {
  id: string;
  _id?: string;  
  email: string;
  name: string;
  status: 'active' | 'unsubscribed';
  subscribed: string;
  source?: 'mailchimp' | 'csv' | 'manual';
}

export interface ApiAnalyticsSummary {
  subscribers: { total: number; change: number };
  newsletters: { total: number; change: number };
  growthData?: GrowthData[];
  recentActivity?: RecentActivity[];
}

export interface GrowthData {
  date?: string;
  month?: string;
  subscribers?: number;
  [key: string]: any;
}

export interface RecentActivity {
  title: string;  
  recipients: number;
  time: string;
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

export interface Newsletter {
  contentQuality?: ContentQuality;
  id?: string;
  _id?: string;
  title: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  scheduledDate?: string;
  sentDate?: string;
  sentTo?: number;
  createdBy: string;
}

export interface User {
  email: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null;
  trialEndsAt?: Date;
}