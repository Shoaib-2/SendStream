// API types for frontend
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AuthResponse {
  user: {
    _id: string;
    id?: string;
    email: string;
    name?: string;
    role: string;
    hasActiveSubscription: boolean;
    trialEndsAt?: string | Date;
  };
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  stripeSessionId?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  password: string;
}

export interface SubscriptionStatus {
  hasSubscription: boolean;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd?: Date | string;
    cancelAtPeriodEnd?: boolean;
    trialEnd?: Date | string;
  } | null;
  error?: string;
}

export interface CreateCheckoutSessionRequest {
  email: string;
}

export interface UpdateRenewalRequest {
  subscriptionId: string;
  cancelAtPeriodEnd: boolean;
}
