// backend/src/models/Analytics.ts
import mongoose, { Document } from 'mongoose';

interface IAnalytics extends Document {
 newsletterId: mongoose.Types.ObjectId;
 opens: {
   count: number;
   details: Array<{
     subscriberId: mongoose.Types.ObjectId;
     timestamp: Date;
   }>;
 };
 clicks: {
   count: number;
   details: Array<{
     subscriberId: mongoose.Types.ObjectId;
     url: string;
     timestamp: Date;
   }>;
 };
 bounces: {
   count: number;
   details: Array<{
     subscriberId: mongoose.Types.ObjectId;
     reason: string;
     timestamp: Date;
   }>;
 };
 unsubscribes: {
   count: number;
   details: Array<{
     subscriberId: mongoose.Types.ObjectId;
     reason?: string;
     timestamp: Date;
   }>;
 };
}

const analyticsSchema = new mongoose.Schema({
 newsletterId: {
   type: mongoose.Schema.Types.ObjectId,
   ref: 'Newsletter',
   required: true
 },
 opens: {
   count: { type: Number, default: 0 },
   details: [{
     subscriberId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: 'Subscriber'
     },
     timestamp: { type: Date, default: Date.now }
   }]
 },
 clicks: {
   count: { type: Number, default: 0 },
   details: [{
     subscriberId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: 'Subscriber'
     },
     url: String,
     timestamp: { type: Date, default: Date.now }
   }]
 },
 bounces: {
   count: { type: Number, default: 0 },
   details: [{
     subscriberId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: 'Subscriber'
     },
     reason: String,
     timestamp: { type: Date, default: Date.now }
   }]
 },
 unsubscribes: {
   count: { type: Number, default: 0 },
   details: [{
     subscriberId: {
       type: mongoose.Schema.Types.ObjectId,
       ref: 'Subscriber'
     },
     reason: String,
     timestamp: { type: Date, default: Date.now }
   }]
 }
}, {
 timestamps: true
});

export default mongoose.model<IAnalytics>('Analytics', analyticsSchema);