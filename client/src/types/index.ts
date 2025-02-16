// src/types/index.ts
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
    subscribed: string; // ISO date string
  }
  
  export interface ApiAnalyticsSummary {
    subscribers: { total: number; change: number };
    newsletters: { total: number; change: number };
    openRate: { value: number; change: number };
    growthData?: GrowthData[];
    recentActivity?: RecentActivity[];
  }

  export interface GrowthData {
    month: string;
    subscribers: number;
  }
  
  export interface RecentActivity {
    title: string;  
    recipients: number;
    time: string;
  }
  
  export interface Newsletter {
    id: string;
    title: string;
    subject: string;
    content: string;
    status: 'draft' | 'scheduled' | 'sent';
    scheduledDate?: string;
    sentDate?: string;
    sentTo?: number;
    openRate?: number;
    clickRate?: number;
    createdBy: string;
  }