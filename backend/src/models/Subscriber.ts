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
  email: { 
    type: String, 
    required: true,
  },
  name: { 
    type: String,
    // Using arrow function to avoid 'this' binding issues
    default: function() { 
      // Safe fallback that doesn't rely on this.email
      return 'subscriber'; 
    }
  },
  status: { 
    type: String, 
    enum: ['active', 'unsubscribed'], 
    default: 'active' 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: false  // Make this optional
  },
  subscribed: {
    type: String,
    default: () => new Date().toISOString()
  },
  unsubscribedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  // Add this to automatically generate _id if not provided
  _id: true 
});
subscriberSchema.index({ email: 1, createdBy: 1 }, { unique: true });

export default mongoose.model<ISubscriber>('Subscriber', subscriberSchema);