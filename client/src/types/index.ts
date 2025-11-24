// Re-export all types from modules
export * from './models';
export * from './api';

// Legacy types for backward compatibility
export interface PricingTier {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
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
  [key: string]: unknown;
}

export interface RecentActivity {
  title: string;  
  recipients: number;
  time: string;
}