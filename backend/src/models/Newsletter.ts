// backend/src/models/Newsletter.ts
import mongoose, { Document } from 'mongoose';

interface INewsletter extends Document {
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
}

const newsletterSchema = new mongoose.Schema({
 title: {
   type: String,
   required: [true, 'Newsletter title is required'],
   trim: true
 },
 subject: {
   type: String,
   required: [true, 'Email subject is required'],
   trim: true
 },
 content: {
   type: String,
   required: [true, 'Newsletter content is required']
 },
 status: {
   type: String,
   enum: ['draft', 'scheduled', 'sent'],
   default: 'draft'
 },
 scheduledDate: Date,
 sentDate: Date,
 sentTo: Number,
 openRate: Number,
 clickRate: Number,
 createdBy: {
   type: mongoose.Schema.Types.ObjectId,
   ref: 'User',
   required: true
 }
}, {
 timestamps: true
});

export default mongoose.model<INewsletter>('Newsletter', newsletterSchema);