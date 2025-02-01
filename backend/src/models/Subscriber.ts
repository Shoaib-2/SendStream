// backend/src/models/Subscriber.ts
import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'unsubscribed'], default: 'active' },
  subscribed: { type: Date, default: Date.now }
});

export default mongoose.model('Subscriber', subscriberSchema);