// backend/src/controllers/auth.controller.ts
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
  sameSite: 'strict' as const,// Prevents CSRF
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
};

// Helper to create and send JWT token
const createSendToken = (user: any, statusCode: number, res: Response) => {
    // Create JWT payload
    const payload = { id: user._id, role: user.role };
    
    // Get secret key from environment
    const secret = process.env.JWT_SECRET as string;
    
    // Simple signing with minimal options
    const token = jwt.sign(payload, secret);
  
    // Remove password from output
    user.password = undefined;
  
    // Set HTTP-only cookie
    res.cookie('jwt', token, cookieOptions);
  
    // Send response with token (for backwards compatibility)
    res.status(statusCode).json({
      status: 'success',
      data: {
        token,
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
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

    // Create new user with type assertion
    const user = new User({
      email,
      password,
    });

    // If Stripe session ID provided, associate subscription with user
    if (stripeSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
        
        if (session.subscription) {
          // Use type assertion to access Stripe fields
          (user as any).stripeSubscriptionId = session.subscription as string;
          (user as any).stripeCustomerId = session.customer as string;
          (user as any).subscriptionStatus = 'trialing';
          
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 14);
          (user as any).trialEndsAt = trialEnd;
        }
      } catch (stripeError) {
        console.error('Error processing Stripe session:', stripeError);
      }
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
  // Clear JWT cookie by setting it to expired
  res.cookie('jwt', 'loggedout', {
    ...cookieOptions,
    maxAge: 1 // Expire immediately
  });
  
  res.status(200).json({ status: 'success' });
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
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

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