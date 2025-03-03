import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  userId: mongoose.Types.ObjectId;
  email: {
    fromName: { type: String, required: true },
    replyTo: { type: String, required: true },
    senderEmail: { type: String, required: true }
  },
  mailchimp?: {
    apiKey: string;
    serverPrefix: string;
    enabled: boolean;
    listId?: string;
    autoSync: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const settingsSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  email: {
    fromName: { type: String, required: true },
    replyTo: { type: String, required: true },
    senderEmail: { type: String, required: true }
  },
  mailchimp: {
    apiKey: String,
    serverPrefix: String,
    enabled: { type: Boolean, default: false },
    listId: String,
    autoSync: { type: Boolean, default: false }
  },
}, {
  timestamps: true
});

export default mongoose.model<ISettings>('Settings', settingsSchema);