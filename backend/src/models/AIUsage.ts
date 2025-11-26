import mongoose, { Schema, Document } from 'mongoose';

export interface IAIUsage extends Document {
  userId: mongoose.Types.ObjectId;
  featureType: 'generate_content' | 'improve_content' | 'subject_lines' | 'smart_schedule' | 'generate_title';
  count: number;
  lastReset: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AIUsageSchema = new Schema<IAIUsage>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  featureType: {
    type: String,
    enum: ['generate_content', 'improve_content', 'subject_lines', 'smart_schedule', 'generate_title'],
    required: true
  },
  count: {
    type: Number,
    default: 0,
    min: 0
  },
  lastReset: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
AIUsageSchema.index({ userId: 1, featureType: 1 }, { unique: true });

// Reset counter daily (called via cron job)
AIUsageSchema.statics.resetDailyLimits = async function() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  await this.updateMany(
    { lastReset: { $lte: oneDayAgo } },
    { $set: { count: 0, lastReset: new Date() } }
  );
};

export const AIUsage = mongoose.model<IAIUsage>('AIUsage', AIUsageSchema);
