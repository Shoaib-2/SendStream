// src/models/EmailUsage.ts
import mongoose from 'mongoose';

export interface EmailUsage {
  userId: mongoose.Types.ObjectId;
  date: Date;
  emailsSent: number;
  lastUpdated: Date;
}

const emailUsageSchema = new mongoose.Schema<EmailUsage>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  emailsSent: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

// Create a compound index for efficient lookups
emailUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

// Create and export the model
const EmailUsageModel = mongoose.models.EmailUsage || mongoose.model<EmailUsage>('EmailUsage', emailUsageSchema);

export default EmailUsageModel;