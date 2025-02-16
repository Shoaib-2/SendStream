// backend/src/models/Newsletter.ts
import mongoose, { Document, Schema } from 'mongoose';


interface DailyStats {
  date: string;
  opens: number;
  clicks: number;
}

interface INewsletter extends Document {
  _id: mongoose.Types.ObjectId; 
 title: string;
 subject: string;
 content: string;
 status: 'draft' | 'scheduled' | 'sent';
 scheduledDate?: Date;
 sentDate?: Date;
 sentTo?: number;
 openRate?: number;
 clickRate?: number;
 createdBy: mongoose.Types.ObjectId;
 opens?: Array<{
  subscriberId: mongoose.Types.ObjectId;
  timestamp: Date;
}>;
dailyStats: DailyStats[];
}

const newsletterSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ['draft', 'scheduled', 'sent'], default: 'draft' },
  sentTo: { type: Number, default: 0 },
  openRate: { type: Number, default: 0 },
  clickRate: { type: Number, default: 0 },
  scheduledDate: Date,
  sentDate: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dailyStats: [{
    date: String,
    opens: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 }
  }]
}, { timestamps: true });

export default mongoose.model<INewsletter>('Newsletter', newsletterSchema);