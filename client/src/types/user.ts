// Define user interface for client-side usage
export interface IUser {
  _id: string;
  email: string;
  role: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null;
  trialEndsAt?: Date;
  cancelAtPeriodEndPreference?: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  trialUsed: boolean;
}

export type UserRole = 'admin' | 'user';
