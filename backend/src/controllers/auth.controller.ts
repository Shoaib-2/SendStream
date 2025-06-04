import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { APIError } from '../utils/errors';
import dotenv from 'dotenv';
import { emailService } from '../services/email.service';
import Stripe from 'stripe';
dotenv.config();


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia', // Use the latest API version
});

// Cookie configuration for security
const cookieOptions = {
  httpOnly: true,             // Prevents JavaScript access
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const, // Allow cross-site in production
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined // Allow sharing between subdomains in production
};

// Helper to create and send JWT token
const createSendToken = (user: any, statusCode: number, res: Response) => {
    // Create JWT payload with user ID and essential info
    const payload = { 
      id: user._id, 
      role: user.role,
      email: user.email
    };
    
    // Get secret key from environment with fallback (for development only)
    const secret = process.env.JWT_SECRET || 'fallback-secret-for-dev';
    
    // Sign token with expiration
    const token = jwt.sign(payload, secret, {
      expiresIn: '24h' // Match cookie expiration
    });
  
    // Remove sensitive data from output
    user.password = undefined;
    
    // Set HTTP-only cookie with path
    res.cookie('jwt', token, {
      ...cookieOptions,
      path: '/' // Ensure cookie is available on all paths
    });
    
    // Set authorization header for API clients
    res.setHeader('Authorization', `Bearer ${token}`);
  
    // Send response with token (for backwards compatibility)
    res.status(statusCode).json({
      status: 'success',
      data: {
        token, // Include token for backwards compatibility
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
          hasActiveSubscription: !!(user as any).stripeSubscriptionId,
          trialEndsAt: (user as any).trialEndsAt
        }
      }
    });
  };

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, stripeSessionId } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Require Stripe session ID for registration
    if (!stripeSessionId) {
      return res.status(403).json({
        status: 'error',
        message: 'Direct signup is not allowed. Please start a free trial first.',
        code: 'TRIAL_REQUIRED'
      });
    }

    // Create new user with type assertion
    const user = new User({
      email,
      password,
    });

    // Validate and associate subscription with user
    try {
      const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
      
      if (!session || !session.subscription) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid or expired session. Please start a free trial again.',
          code: 'INVALID_SESSION'
        });
      }
      
      // Use type assertion to access Stripe fields
      (user as any).stripeSubscriptionId = session.subscription as string;
      (user as any).stripeCustomerId = session.customer as string;
      (user as any).subscriptionStatus = 'trialing';
      
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);
      (user as any).trialEndsAt = trialEnd;
    } catch (stripeError) {
      console.error('Error processing Stripe session:', stripeError);
      return res.status(400).json({
        status: 'error',
        message: 'Invalid or expired trial session. Please start a free trial again.',
        code: 'STRIPE_ERROR'
      });
    }

    await user.save();
    const token = user.generateToken();

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          hasActiveSubscription: !!(user as any).stripeSubscriptionId
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Registration failed'
    });
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Check if email and password exist
    if (!email || !password) {
      throw new APIError(400, 'Please provide email and password');
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new APIError(401, 'Incorrect email or password');
    }

    // Create token and send response
    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

export const logout = (req: Request, res: Response) => {
  // Clear JWT cookie
  res.cookie('jwt', 'loggedout', {
    ...cookieOptions,
    maxAge: 1, // Expire immediately
    path: '/', // Ensure cookie is cleared from all paths
  });
  
  // Clear Authorization header
  res.setHeader('Authorization', '');
  
  // Send success response with clear instructions for client
  res.status(200).json({ 
    status: 'success',
    message: 'Successfully logged out',
    clearAuth: true // Signal to client to clear local storage
  });
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    // Check if email exists
    if (!email) {
      throw new APIError(400, 'Please provide your email address');
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      // For security reasons, don't reveal if user exists
      return res.status(200).json({
        status: 'success',
        message: 'If your email is registered with us, you will receive a password reset link'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store hashed token in database
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    user.passwordResetExpires = resetTokenExpires;
    await user.save({ validateBeforeSave: false });    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send email
    try {
      const emailHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your Newsletter Automation Service account.</p>
          <p>Click the button below to reset your password. This link is valid for 10 minutes.</p>
          <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
          <p style="color: #64748b; font-size: 14px;">Newsletter Automation Service</p>
        </div>
      `;
      
      // Ensure email exists before using it
      const senderEmail = process.env.EMAIL_USER || 'noreply@example.com';
      
      // Create a custom email for password reset
      const mailOptions = {
        from: senderEmail,
        to: user.email,
        subject: 'Password Reset Request',
        html: emailHTML
      };
      
      // Use a custom method to send the email instead of accessing private transporter
      await emailService.sendEmail(mailOptions);

      res.status(200).json({
        status: 'success',
        message: 'If your email is registered with us, you will receive a password reset link'
      });
    } catch (err) {
      // Reset token fields if email fails
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      throw new APIError(500, 'There was an error sending the email. Please try again later');
    }
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Validate password
    if (!password || password.length < 8) {
      throw new APIError(400, 'Password must be at least 8 characters long');
    }

    // Hash token from params
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    // Check if token is valid and not expired
    if (!user) {
      throw new APIError(400, 'Token is invalid or has expired');
    }

    // Update password and clear reset fields
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Create and send new token
    createSendToken(user, 200, res);
  } catch (error) {
    next(error);
  }
};

const rateLimitStore: {[key: string]: number[]} = {};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const recentChecks = rateLimitStore[ip] || [];
  
  // Remove checks older than 1 hour
  const filteredChecks = recentChecks.filter(time => now - time < 3600000);
  
  // Allow max 10 checks per hour
  if (filteredChecks.length >= 10) {
    return false;
  }
  
  // Add current timestamp
  filteredChecks.push(now);
  rateLimitStore[ip] = filteredChecks;
  
  return true;
}


export const checkTrialEligibility = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.query;

  // Validate email is present and not empty
  if (!email || typeof email !== 'string' || email.trim() === '') {
    return res.status(400).json({
      status: 'error',
      message: 'Valid email is required'
    });
  }

  try {
    const user = await User.findOne({ email });

    res.status(200).json({
      status: 'success',
      eligibleForTrial: !user || !user.trialUsed
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Implement token validation and generation
function generateTrialCheckToken() {
  // Create a short-lived, cryptographically secure token
  return crypto.randomBytes(16).toString('hex');
}

function isValidTrialCheckToken(token: string) {
  // Implement token validation logic
  // Check against stored tokens, expiration, etc.
}