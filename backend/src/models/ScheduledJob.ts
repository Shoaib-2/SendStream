// models/ScheduledJob.ts
import mongoose, { Document, Schema } from 'mongoose';

interface IScheduledJob extends Document {
 newsletterId: mongoose.Types.ObjectId;
 scheduledDate: Date;
 jobId: string;
 status: 'pending' | 'completed' | 'failed';
 createdAt: Date;
 updatedAt: Date;
}

const scheduledJobSchema = new Schema({
 newsletterId: {
   type: Schema.Types.ObjectId,
   ref: 'Newsletter',
   required: true
 },
 scheduledDate: {
   type: Date,
   required: true
 },
 jobId: {
   type: String,
   required: true
 },
 status: {
   type: String,
   enum: ['pending', 'completed', 'failed'],
   default: 'pending'
 }
}, { timestamps: true });

export default mongoose.model<IScheduledJob>('ScheduledJob', scheduledJobSchema);