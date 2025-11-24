"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRepository = exports.UserRepository = void 0;
const User_1 = __importDefault(require("../models/User"));
/**
 * UserRepository - Data access layer for User model
 * Abstracts all database operations for users
 */
class UserRepository {
    /**
     * Find user by ID
     */
    async findById(userId) {
        return await User_1.default.findById(userId).lean();
    }
    /**
     * Find user by ID with password field included
     */
    async findByIdWithPassword(userId) {
        return await User_1.default.findById(userId).select('+password');
    }
    /**
     * Find user by email
     */
    async findByEmail(email) {
        return await User_1.default.findOne({ email: email.toLowerCase() }).lean();
    }
    /**
     * Find user by email with password field included
     */
    async findByEmailWithPassword(email) {
        return await User_1.default.findOne({ email: email.toLowerCase() }).select('+password');
    }
    /**
     * Find user by password reset token
     */
    async findByResetToken(token) {
        return await User_1.default.findOne({
            passwordResetToken: token,
            passwordResetExpires: { $gt: Date.now() }
        });
    }
    /**
     * Find user by Stripe customer ID
     */
    async findByStripeCustomerId(customerId) {
        return await User_1.default.findOne({ stripeCustomerId: customerId }).lean();
    }
    /**
     * Create a new user
     */
    async create(userData) {
        return await User_1.default.create(userData);
    }
    /**
     * Update user by ID
     */
    async update(userId, updateData) {
        return await User_1.default.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
    }
    /**
     * Update user password (triggers pre-save hook for hashing)
     */
    async updatePassword(userId, newPassword) {
        const user = await User_1.default.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        user.password = newPassword;
        return await user.save();
    }
    /**
     * Update user and return previous state
     */
    async updateAndReturnOld(userId, updateData) {
        return await User_1.default.findByIdAndUpdate(userId, updateData, { new: false, runValidators: true });
    }
    /**
     * Delete user by ID
     */
    async delete(userId) {
        return await User_1.default.findByIdAndDelete(userId);
    }
    /**
     * Check if user exists by email
     */
    async existsByEmail(email) {
        const count = await User_1.default.countDocuments({ email: email.toLowerCase() });
        return count > 0;
    }
    /**
     * Check if email is available for registration
     */
    async isEmailAvailable(email) {
        const exists = await this.existsByEmail(email);
        return !exists;
    }
    /**
     * Update password reset token
     */
    async updateResetToken(userId, token, expires) {
        return await User_1.default.findByIdAndUpdate(userId, {
            passwordResetToken: token,
            passwordResetExpires: expires
        }, { new: true });
    }
    /**
     * Clear password reset token
     */
    async clearResetToken(userId) {
        return await User_1.default.findByIdAndUpdate(userId, {
            $unset: {
                passwordResetToken: 1,
                passwordResetExpires: 1
            }
        }, { new: true });
    }
    /**
     * Update Stripe subscription data
     */
    async updateStripeData(userId, data) {
        return await User_1.default.findByIdAndUpdate(userId, data, { new: true });
    }
    /**
     * Mark trial as used
     */
    async markTrialUsed(userId) {
        return await User_1.default.findByIdAndUpdate(userId, { trialUsed: true }, { new: true });
    }
    /**
     * Get all users (admin function)
     */
    async findAll(filter = {}) {
        return await User_1.default.find(filter);
    }
    /**
     * Count users by filter
     */
    async count(filter = {}) {
        return await User_1.default.countDocuments(filter);
    }
    /**
     * Find all users with active subscriptions
     */
    async findActiveSubscribers() {
        return await User_1.default.find({
            subscriptionStatus: { $in: ['active', 'trialing'] },
            hasActiveAccess: true
        }).lean();
    }
    /**
     * Get users with expiring trials (for notifications)
     */
    async findExpiringTrials(daysFromNow) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysFromNow);
        const startOfDay = new Date(futureDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(futureDate);
        endOfDay.setHours(23, 59, 59, 999);
        return await User_1.default.find({
            subscriptionStatus: 'trialing',
            trialEndsAt: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });
    }
}
exports.UserRepository = UserRepository;
exports.userRepository = new UserRepository();
