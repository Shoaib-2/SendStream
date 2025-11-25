import mongoose, { Document, Schema } from 'mongoose';
import { encrypt, decrypt } from '../utils/encryption';
import { logger } from '../utils/logger';

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
  getDecryptedMailchimpApiKey(): string | undefined;
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

// Encrypt Mailchimp API key before saving
settingsSchema.pre('save', function(next) {
  if (this.isModified('mailchimp.apiKey') && this.mailchimp?.apiKey) {
    try {
      // Only encrypt if it's not already encrypted (check if it's a valid base64 string with our format)
      // This prevents double encryption
      const apiKey = this.mailchimp.apiKey;
      if (!isEncrypted(apiKey)) {
        this.mailchimp.apiKey = encrypt(apiKey);
      }
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Helper function to check if a value is already encrypted
function isEncrypted(value: string): boolean {
  // Our encrypted values are base64 and have minimum length due to IV + tag + data
  // If it's not base64 or too short, it's not encrypted
  try {
    const buffer = Buffer.from(value, 'base64');
    // Encrypted values should be at least IV_LENGTH + TAG_LENGTH + some data
    return buffer.length > 32 && value === buffer.toString('base64');
  } catch {
    return false;
  }
}

// Add method to get decrypted API key
settingsSchema.methods.getDecryptedMailchimpApiKey = function(): string | undefined {
  if (!this.mailchimp?.apiKey) {
    return undefined;
  }
  
  try {
    return decrypt(this.mailchimp.apiKey);
  } catch (error) {
    logger.error('Decryption failed:', error);
    logger.warn('Failed to decrypt Mailchimp API key - encryption key may have changed');
    return undefined;
  }
};

export default mongoose.model<ISettings>('Settings', settingsSchema);