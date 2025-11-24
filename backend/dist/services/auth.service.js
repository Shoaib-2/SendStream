"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const UserRepository_1 = require("../repositories/UserRepository");
const customErrors_1 = require("../utils/customErrors");
const logger_1 = require("../utils/logger");
const validation_1 = require("../utils/validation");
const stripe_1 = __importDefault(require("stripe"));
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
});
class AuthService {
    /**
     * Generate JWT token for user
     */
    generateToken(payload) {
        const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
        return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: '24h' });
    }
    /**
     * Validate and retrieve Stripe session
     */
    async validateStripeSession(sessionId) {
        try {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            if (!session || !session.subscription) {
                throw new customErrors_1.ValidationError('Invalid or expired session. Please start a free trial again.');
            }
            return {
                subscriptionId: session.subscription,
                customerId: session.customer
            };
        }
        catch (error) {
            logger_1.logger.error('Error retrieving Stripe session:', error);
            throw new customErrors_1.ValidationError('Invalid or expired trial session. Please start a free trial again.');
        }
    }
    /**
     * Register a new user with Stripe subscription
     */
    async register(data) {
        const { email, password, stripeSessionId } = data;
        // Validate password strength
        const passwordValidation = (0, validation_1.validatePasswordStrength)(password);
        if (!passwordValidation.isValid) {
            throw new customErrors_1.ValidationError(`Password does not meet security requirements:\n${passwordValidation.errors.join('\n')}`);
        }
        // Check if user already exists
        const existingUser = await UserRepository_1.userRepository.findByEmail(email);
        if (existingUser) {
            throw new customErrors_1.ConflictError('User with this email already exists');
        }
        // Require Stripe session ID for registration
        if (!stripeSessionId) {
            throw new customErrors_1.ValidationError('Direct signup is not allowed. Please start a free trial first.');
        }
        // Create new user
        const user = await UserRepository_1.userRepository.create({ email, password });
        // Validate and associate subscription
        try {
            const { subscriptionId, customerId } = await this.validateStripeSession(stripeSessionId);
            // Update user with Stripe subscription data
            const updatedUser = await UserRepository_1.userRepository.updateStripeData(String(user._id), {
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                subscriptionStatus: 'trialing',
                hasActiveAccess: true,
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            });
            await UserRepository_1.userRepository.markTrialUsed(String(user._id));
            // Generate token
            const payload = {
                id: String(user._id),
                role: user.role || 'user',
                email: user.email
            };
            const token = this.generateToken(payload);
            return {
                user: {
                    id: updatedUser?._id || user._id,
                    email: user.email,
                    hasActiveSubscription: true
                },
                token
            };
        }
        catch (error) {
            logger_1.logger.error('Error processing Stripe session:', error);
            throw error;
        }
    }
    /**
     * Authenticate user with email and password
     */
    async login(data) {
        const { email, password } = data;
        // Validate input
        if (!email || !password) {
            throw new customErrors_1.ValidationError('Please provide email and password');
        }
        // Find user
        const user = await UserRepository_1.userRepository.findByEmailWithPassword(email);
        // Debug logging
        logger_1.logger.debug(`Login attempt for email: ${email}`);
        logger_1.logger.debug(`User found: ${!!user}`);
        if (!user) {
            logger_1.logger.warn(`Login failed: User not found for email ${email}`);
            throw new customErrors_1.AuthenticationError('Incorrect email or password');
        }
        const passwordMatch = await user.comparePassword(password);
        logger_1.logger.debug(`Password match: ${passwordMatch}`);
        if (!passwordMatch) {
            logger_1.logger.warn(`Login failed: Incorrect password for email ${email}`);
            throw new customErrors_1.AuthenticationError('Incorrect email or password');
        }
        // Create JWT payload
        const payload = {
            id: String(user._id),
            role: user.role,
            email: user.email
        };
        const token = this.generateToken(payload);
        // Remove password from output
        user.password = undefined;
        return {
            user: {
                _id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                hasActiveSubscription: !!user.stripeSubscriptionId,
                trialEndsAt: user.trialEndsAt
            },
            token
        };
    }
    /**
     * Generate password reset token
     */
    async generatePasswordResetToken(email) {
        const user = await UserRepository_1.userRepository.findByEmail(email);
        // Don't reveal if user exists
        if (!user) {
            return null;
        }
        // Generate reset token
        const resetToken = crypto_1.default.randomBytes(32).toString('hex');
        const resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        // Store hashed token in database
        const hashedToken = crypto_1.default
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        await UserRepository_1.userRepository.updateResetToken(String(user._id), hashedToken, resetTokenExpires);
        // Create reset URL
        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
        return { resetUrl, user };
    }
    /**
     * Clear password reset token (on error)
     */
    async clearPasswordResetToken(userId) {
        await UserRepository_1.userRepository.clearResetToken(userId);
    }
    /**
     * Reset password using token
     */
    async resetPassword(token, newPassword) {
        // Validate password strength
        const passwordValidation = (0, validation_1.validatePasswordStrength)(newPassword);
        if (!passwordValidation.isValid) {
            throw new customErrors_1.ValidationError(`Password does not meet security requirements:\n${passwordValidation.errors.join('\n')}`);
        }
        // Find user with valid token
        const hashedToken = crypto_1.default
            .createHash('sha256')
            .update(token)
            .digest('hex');
        const user = await UserRepository_1.userRepository.findByResetToken(hashedToken);
        if (!user) {
            throw new customErrors_1.ValidationError('Token is invalid or has expired');
        }
        // Update password using updatePassword to trigger hashing
        await UserRepository_1.userRepository.updatePassword(String(user._id), newPassword);
        await UserRepository_1.userRepository.clearResetToken(String(user._id));
        // Generate new token
        const payload = {
            id: String(user._id),
            role: user.role || 'user',
            email: user.email
        };
        const jwtToken = this.generateToken(payload);
        return {
            user: {
                _id: user._id,
                email: user.email,
                role: user.role,
                hasActiveSubscription: !!user.stripeSubscriptionId,
                trialEndsAt: user.trialEndsAt
            },
            token: jwtToken
        };
    }
    /**
     * Check if email is eligible for trial
     */
    async checkTrialEligibility(email) {
        if (!email || typeof email !== 'string' || email.trim() === '') {
            throw new customErrors_1.ValidationError('Valid email is required');
        }
        const user = await UserRepository_1.userRepository.findByEmail(email);
        return !user || !user.trialUsed;
    }
}
exports.AuthService = AuthService;
exports.authService = new AuthService();
