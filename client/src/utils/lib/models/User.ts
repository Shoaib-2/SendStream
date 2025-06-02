import mongoose from 'mongoose';
import { IUser } from '@/types/user';

// Note: This is a client-side schema, we don't include sensitive fields like password
const userSchema = new mongoose.Schema<IUser>({
  _id: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true, enum: ['admin', 'user'], default: 'user' },
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  subscriptionStatus: { 
    type: String, 
    enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid', null],
    default: null
  },
  trialEndsAt: { type: Date },
  cancelAtPeriodEndPreference: { type: Boolean, default: false },
  trialUsed: { type: Boolean, default: false },
});

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);