// API request and response type definitions

// Request body types
export interface RegisterRequest {
  email: string;
  password: string;
  stripeSessionId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
}

export interface CreateNewsletterRequest {
  title: string;
  subject: string;
  content: string;
  contentQuality?: {
    isOriginalContent?: boolean;
    hasResearchBacked?: boolean;
    hasActionableInsights?: boolean;
    sources?: string[];
    keyTakeaways?: string[];
  };
}

export interface UpdateNewsletterRequest {
  title?: string;
  subject?: string;
  content?: string;
  contentQuality?: {
    isOriginalContent?: boolean;
    hasResearchBacked?: boolean;
    hasActionableInsights?: boolean;
    sources?: string[];
    keyTakeaways?: string[];
  };
}

export interface ScheduleNewsletterRequest {
  scheduledDate: string | number;
}

export interface CreateSubscriberRequest {
  email: string;
  name: string;
}

export interface UpdateSubscriberRequest {
  name?: string;
  status?: 'active' | 'unsubscribed';
}

export interface BulkDeleteSubscribersRequest {
  ids: string[];
}

export interface ImportSubscribersRequest {
  csvData: string;
}

export interface UpdateSettingsRequest {
  email?: {
    fromName?: string;
    replyTo?: string;
    senderEmail?: string;
  };
  mailchimp?: {
    apiKey?: string;
    serverPrefix?: string;
    enabled?: boolean;
    autoSync?: boolean;
  };
}

export interface CreateTrialSessionRequest {
  email: string;
}

export interface UpdateRenewalRequest {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}

// Response types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    role: string;
    hasActiveSubscription: boolean;
    trialEndsAt?: Date;
  };
  token: string;
}

export interface SubscriptionStatusResponse {
  hasSubscription: boolean;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: Date;
  } | null;
}

// Mailchimp types
export interface MailchimpListResponse {
  lists: Array<{
    id: string;
    name: string;
    stats: {
      member_count: number;
      unsubscribe_count: number;
      cleaned_count: number;
    };
  }>;
  total_items: number;
}

export interface MailchimpCampaignResponse {
  id: string;
  type: string;
  status: string;
  settings: {
    subject_line: string;
    from_name: string;
    reply_to: string;
  };
}

export interface MailchimpMemberResponse {
  members: Array<{
    email_address: string;
    merge_fields: {
      FNAME?: string;
    };
    status: string;
    timestamp_signup: string;
  }>;
  total_items: number;
}

// Stripe types
export interface StripeSubscription {
  id: string;
  customer: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  current_period_end: number;
  cancel_at_period_end: boolean;
  trial_end?: number;
}
