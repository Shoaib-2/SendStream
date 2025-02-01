// backend/src/models/Newsletter.ts
import mongoose from 'mongoose';

const newsletterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'scheduled', 'sent'],
    default: 'draft'
  },
  scheduledDate: Date,
  sentDate: Date,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Newsletter', newsletterSchema);