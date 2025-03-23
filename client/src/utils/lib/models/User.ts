import mongoose from 'mongoose';
import { User } from '@/types';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  id: { type: String },
  _id: { type: String },
  // User-specific fields
  stripeCustomerId: { type: String },
  stripeSubscriptionId: { type: String },
  subscriptionStatus: { 
    type: String, 
    enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid', null],
    default: null
  },
  trialEndsAt: { type: Date },
  trialUsed: { type: Boolean, default: false },
  // Common fields for both User and Subscriber
  name: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'unsubscribed'],
    default: 'active'
  },
  subscribed: { type: String, required: true },
  source: { 
    type: String, 
    enum: ['mailchimp', 'csv', 'manual'] 
  }
});

export default mongoose.models.User || mongoose.model<User>('User', userSchema);