import mongoose from 'mongoose';
import { Subscriber } from '@/types';

const userSchema = new mongoose.Schema<Subscriber>({
  email: { type: String, required: true },
  id: { type: String },
  _id: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'unsubscribed'],
    default: 'active'
  },
  subscribed: { type: String, required: true },
  source: { 
    type: String, 
    enum: ['mailchimp', 'csv', 'manual'] 
  },
  name: { type: String }
});

export default mongoose.models.User || mongoose.model<Subscriber>('User', userSchema);