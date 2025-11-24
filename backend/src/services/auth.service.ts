import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { userRepository } from '../repositories/UserRepository';
import { AuthenticationError, ValidationError, ConflictError } from '../utils/customErrors';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

interface RegisterData {
  email: string;
  password: string;
  stripeSessionId?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface TokenPayload {
  id: string;
  role: string;
  email: string;
}

export class AuthService {
  /**
   * Generate JWT token for user
   */
  generateToken(payload: TokenPayload): string {
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    return jwt.sign(payload, secret, { expiresIn: '24h' });
  }

  /**
   * Validate and retrieve Stripe session
   */
  async validateStripeSession(sessionId: string): Promise<{ subscriptionId: string; customerId: string }> {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      if (!session || !session.subscription) {
        throw new ValidationError('Invalid or expired session. Please start a free trial again.');
      }
      
      return {
        subscriptionId: session.subscription as string,
        customerId: session.customer as string
      };
    } catch (error) {
      logger.error('Error retrieving Stripe session:', error);
      throw new ValidationError('Invalid or expired trial session. Please start a free trial again.');
    }
  }

  /**
   * Register a new user with Stripe subscription
   */
  async register(data: RegisterData): Promise<{ user: any; token: string }> {
    const { email, password, stripeSessionId } = data;

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Require Stripe session ID for registration
    if (!stripeSessionId) {
      throw new ValidationError('Direct signup is not allowed. Please start a free trial first.');
    }

    // Create new user
    const user = await userRepository.create({ email, password });

    // Validate and associate subscription
    try {
      const { subscriptionId, customerId } = await this.validateStripeSession(stripeSessionId);
      
      // Update user with Stripe subscription data
      const updatedUser = await userRepository.updateStripeData(String(user._id), {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        subscriptionStatus: 'trialing',
        hasActiveAccess: true,
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      });
      await userRepository.markTrialUsed(String(user._id));

      // Generate token
      const payload: TokenPayload = {
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
    } catch (error) {
      logger.error('Error processing Stripe session:', error);
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   */
  async login(data: LoginData): Promise<{ user: any; token: string }> {
    const { email, password } = data;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Please provide email and password');
    }

    // Find user
    const user = await userRepository.findByEmailWithPassword(email);
    
    // Debug logging
    logger.debug(`Login attempt for email: ${email}`);
    logger.debug(`User found: ${!!user}`);
    
    if (!user) {
      logger.warn(`Login failed: User not found for email ${email}`);
      throw new AuthenticationError('Incorrect email or password');
    }
    
    const passwordMatch = await user.comparePassword(password);
    logger.debug(`Password match: ${passwordMatch}`);
    
    if (!passwordMatch) {
      logger.warn(`Login failed: Incorrect password for email ${email}`);
      throw new AuthenticationError('Incorrect email or password');
    }

    // Create JWT payload
    const payload: TokenPayload = {
      id: String(user._id),
      role: user.role,
      email: user.email
    };

    const token = this.generateToken(payload);

    // Remove password from output
    user.password = undefined as any;

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: (user as any).name,
        role: user.role,
        hasActiveSubscription: !!(user as any).stripeSubscriptionId,
        trialEndsAt: (user as any).trialEndsAt
      },
      token
    };
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(email: string): Promise<{ resetUrl: string; user: any } | null> {
    const user = await userRepository.findByEmail(email);
    
    // Don't reveal if user exists
    if (!user) {
      return null;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store hashed token in database
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    await userRepository.updateResetToken(String(user._id), hashedToken, resetTokenExpires);

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    return { resetUrl, user };
  }

  /**
   * Clear password reset token (on error)
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    await userRepository.clearResetToken(userId);
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ user: any; token: string }> {
    // Validate password
    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Find user with valid token
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await userRepository.findByResetToken(hashedToken);

    if (!user) {
      throw new ValidationError('Token is invalid or has expired');
    }

    // Update password using updatePassword to trigger hashing
    await userRepository.updatePassword(String(user._id), newPassword);
    await userRepository.clearResetToken(String(user._id));

    // Generate new token
    const payload: TokenPayload = {
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
        hasActiveSubscription: !!(user as any).stripeSubscriptionId,
        trialEndsAt: (user as any).trialEndsAt
      },
      token: jwtToken
    };
  }

  /**
   * Check if email is eligible for trial
   */
  async checkTrialEligibility(email: string): Promise<boolean> {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new ValidationError('Valid email is required');
    }

    const user = await userRepository.findByEmail(email);
    return !user || !user.trialUsed;
  }
}

export const authService = new AuthService();
