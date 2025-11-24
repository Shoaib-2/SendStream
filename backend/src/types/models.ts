// Type definitions for all database models
import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  role: 'admin' | 'user';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null;
  trialEndsAt?: Date;
  trialUsed: boolean;
  cancelAtPeriodEndPreference?: boolean;
  hasActiveAccess?: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateToken(): string;
}

export interface INewsletter extends Document {
  _id: Types.ObjectId;
  title: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  sentTo: number;
  scheduledDate?: Date;
  sentDate?: Date;
  createdBy: Types.ObjectId;
  contentQuality: IContentQuality;
  createdAt: Date;
  updatedAt: Date;
  calculateQualityScore(): number;
}

export interface IContentQuality {
  isOriginalContent: boolean;
  hasResearchBacked: boolean;
  hasActionableInsights: boolean;
  contentLength: number;
  sources: string[];
  keyTakeaways: string[];
  qualityScore: number;
}

export interface ISubscriber extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  status: 'active' | 'unsubscribed';
  subscribed: Date | string;
  createdBy: Types.ObjectId;
  unsubscribedAt: Date | null;
  source?: 'mailchimp' | 'csv' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnalytics extends Document {
  _id: Types.ObjectId;
  newsletterId: Types.ObjectId;
  createdBy: Types.ObjectId;
  opens: {
    count: number;
    details: Array<{
      subscriberId: Types.ObjectId;
      timestamp: Date;
    }>;
  };
  clicks: {
    count: number;
    details: Array<{
      subscriberId: Types.ObjectId;
      url: string;
      timestamp: Date;
    }>;
  };
  bounces: {
    count: number;
    details: Array<{
      subscriberId: Types.ObjectId;
      reason: string;
      timestamp: Date;
    }>;
  };
  unsubscribes: {
    count: number;
    details: Array<{
      subscriberId: Types.ObjectId;
      reason?: string;
      timestamp: Date;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ISettings extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IEmailUsage extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  date: Date;
  emailsSent: number;
  lastUpdated: Date;
}

export interface IScheduledJob extends Document {
  _id: Types.ObjectId;
  newsletterId: Types.ObjectId;
  scheduledDate: Date;
  jobId: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}
