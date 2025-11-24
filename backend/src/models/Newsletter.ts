import mongoose, { Document, Schema } from 'mongoose';

/*
interface DailyStats {
  date: string;
  opens: number;
  clicks: number;
}
*/

interface ContentQuality {
  isOriginalContent: boolean;
  hasResearchBacked: boolean;
  hasActionableInsights: boolean;
  contentLength: number;
  sources: string[];
  keyTakeaways: string[];
  qualityScore: number;
}

interface INewsletter extends Document {
  title: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  sentTo: number;
  scheduledDate?: Date;
  sentDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  contentQuality: ContentQuality;
  calculateQualityScore(): number;
}

const newsletterSchema = new Schema<INewsletter>({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ['draft', 'scheduled', 'sent'], default: 'draft' },
  sentTo: { type: Number, default: 0 },
  scheduledDate: Date,
  sentDate: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  contentQuality: {
    isOriginalContent: { type: Boolean, default: false },
    hasResearchBacked: { type: Boolean, default: false },
    hasActionableInsights: { type: Boolean, default: false },
    contentLength: { type: Number, default: 0 },
    sources: [String],
    keyTakeaways: [String],
    qualityScore: { type: Number, default: 0 }
  }
}, { timestamps: true });

newsletterSchema.methods.calculateQualityScore = function(this: INewsletter): number {
  let score = 0;
  const quality = this.contentQuality;

  if (quality) {
    score += Math.min(quality.contentLength / 200, 25);
    if (quality.isOriginalContent) score += 25;
    if (quality.hasResearchBacked && quality.sources.length > 0) {
      score += 15 + Math.min(quality.sources.length * 2, 10);
    }
    if (quality.hasActionableInsights && quality.keyTakeaways.length > 0) {
      score += 15 + Math.min(quality.keyTakeaways.length * 2, 10);
    }
    this.contentQuality.qualityScore = Math.round(score);
  }
  return score;
};

newsletterSchema.pre('save', function(this: INewsletter, next) {
  if (this.isModified('content')) {
    this.contentQuality.contentLength = this.content.length;
  }
  this.calculateQualityScore();
  next();
});

export default mongoose.model<INewsletter>('Newsletter', newsletterSchema);