import User from '../models/User';
import { Types } from 'mongoose';

/**
 * UserRepository - Data access layer for User model
 * Abstracts all database operations for users
 */
export class UserRepository {
  /**
   * Find user by ID
   */
  async findById(userId: string | Types.ObjectId) {
    return await User.findById(userId).lean();
  }

  /**
   * Find user by ID with password field included
   */
  async findByIdWithPassword(userId: string | Types.ObjectId) {
    return await User.findById(userId).select('+password');
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return await User.findOne({ email: email.toLowerCase() }).lean();
  }

  /**
   * Find user by email with password field included
   */
  async findByEmailWithPassword(email: string) {
    return await User.findOne({ email: email.toLowerCase() }).select('+password');
  }

  /**
   * Find user by password reset token
   */
  async findByResetToken(token: string) {
    return await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });
  }

  /**
   * Find user by Stripe customer ID
   */
  async findByStripeCustomerId(customerId: string) {
    return await User.findOne({ stripeCustomerId: customerId }).lean();
  }

  /**
   * Create a new user
   */
  async create(userData: {
    email: string;
    password: string;
    role?: string;
    trialEndsAt?: Date;
    subscriptionStatus?: string;
    hasActiveAccess?: boolean;
  }) {
    return await User.create(userData);
  }

  /**
   * Update user by ID
   */
  async update(userId: string | Types.ObjectId, updateData: Record<string, any>) {
    return await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  /**
   * Update user password (triggers pre-save hook for hashing)
   */
  async updatePassword(userId: string | Types.ObjectId, newPassword: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    user.password = newPassword;
    return await user.save();
  }

  /**
   * Update user and return previous state
   */
  async updateAndReturnOld(userId: string | Types.ObjectId, updateData: Record<string, any>) {
    return await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: false, runValidators: true }
    );
  }

  /**
   * Delete user by ID
   */
  async delete(userId: string | Types.ObjectId) {
    return await User.findByIdAndDelete(userId);
  }

  /**
   * Check if user exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    const count = await User.countDocuments({ email: email.toLowerCase() });
    return count > 0;
  }

  /**
   * Check if email is available for registration
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    const exists = await this.existsByEmail(email);
    return !exists;
  }

  /**
   * Update password reset token
   */
  async updateResetToken(userId: string | Types.ObjectId, token: string, expires: Date) {
    return await User.findByIdAndUpdate(
      userId,
      {
        passwordResetToken: token,
        passwordResetExpires: expires
      },
      { new: true }
    );
  }

  /**
   * Clear password reset token
   */
  async clearResetToken(userId: string | Types.ObjectId) {
    return await User.findByIdAndUpdate(
      userId,
      {
        $unset: {
          passwordResetToken: 1,
          passwordResetExpires: 1
        }
      },
      { new: true }
    );
  }

  /**
   * Update Stripe subscription data
   */
  async updateStripeData(
    userId: string | Types.ObjectId,
    data: {
      stripeCustomerId?: string;
      stripeSubscriptionId?: string;
      subscriptionStatus?: string;
      hasActiveAccess?: boolean;
      trialEndsAt?: Date;
      cancelAtPeriodEndPreference?: boolean;
    }
  ) {
    return await User.findByIdAndUpdate(userId, data, { new: true });
  }

  /**
   * Mark trial as used
   */
  async markTrialUsed(userId: string | Types.ObjectId) {
    return await User.findByIdAndUpdate(
      userId,
      { trialUsed: true },
      { new: true }
    );
  }

  /**
   * Get all users (admin function)
   */
  async findAll(filter: Record<string, any> = {}) {
    return await User.find(filter);
  }

  /**
   * Count users by filter
   */
  async count(filter: Record<string, any> = {}): Promise<number> {
    return await User.countDocuments(filter);
  }

  /**
   * Find all users with active subscriptions
   */
  async findActiveSubscribers() {
    return await User.find({
      subscriptionStatus: { $in: ['active', 'trialing'] },
      hasActiveAccess: true
    }).lean();
  }

  /**
   * Get users with expiring trials (for notifications)
   */
  async findExpiringTrials(daysFromNow: number) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysFromNow);

    const startOfDay = new Date(futureDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(futureDate);
    endOfDay.setHours(23, 59, 59, 999);

    return await User.find({
      subscriptionStatus: 'trialing',
      trialEndsAt: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
  }
}

export const userRepository = new UserRepository();
