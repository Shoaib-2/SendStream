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

// Type guard for IUser
export function isIUser(obj: unknown): obj is IUser {
  if (typeof obj !== 'object' || obj === null) return false;
  const user = obj as Partial<IUser>;
  return (
    typeof user._id === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string'
  );
}
