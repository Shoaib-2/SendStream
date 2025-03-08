// backend/src/models/User.ts
import mongoose, { Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config();

interface IUser extends Document {
  email: string;
  password: string;
  role: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null;
  trialEndsAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateToken(): string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

const userSchema = new mongoose.Schema({
  stripeCustomerId: {
    type: String,
    default: null
  },
  stripeSubscriptionId: {
    type: String,
    default: null
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid', null],
    default: null
  },
  trialEndsAt: {
    type: Date,
    default: null
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});


// Define comparePassword method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    if (!this.password) {
      const userModel = mongoose.model<IUser>('User');
      const user = await userModel.findById(this._id).select('+password');
      if (!user) return false;
      return bcrypt.compare(candidatePassword, user.password);
    }
    return bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

// Define generateToken method
userSchema.methods.generateToken = function(): string {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }  // Increased expiration time
  );
};

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare passwords method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};


const User = mongoose.model<IUser>('User', userSchema);
export default User;