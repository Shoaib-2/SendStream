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
    email: string;
    name: string;
    subscribed: string;
    status: 'active' | 'unsubscribed';
  }
  
  export interface Newsletter {
    id: string;
    title: string;
    subject: string;
    content: string;
    status: 'draft' | 'scheduled' | 'sent';
    scheduledDate?: string;
    sentDate?: string;
  }