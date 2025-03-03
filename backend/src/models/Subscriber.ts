// backend/src/models/Subscriber.ts
import mongoose, { Document, Schema } from 'mongoose';


export interface ISubscriber extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  status: 'active' | 'unsubscribed';
  subscribed: Date;
  createdBy: mongoose.Types.ObjectId;  // Changed from optional string to required ObjectId
  unsubscribedAt: Date | null;
  source?: string;
}

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  status: { type: String, enum: ['active', 'unsubscribed'], default: 'active' },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
  },
  subscribed: { type: Date, default: Date.now },
  unsubscribedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});


export default mongoose.model<ISubscriber>('Subscriber', subscriberSchema);