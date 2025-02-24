// backend/src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { APIError } from '../utils/errors';
import dotenv from 'dotenv';
dotenv.config();

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
    const { email, password, name } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new APIError(400, 'User already exists');
    }

    // Create user
    const user = await User.create({
      email,
      password, // Will be hashed by model pre-save hook
      name: name || email.split('@')[0],
      role: 'user'
    });

    // Create token and send response
    createSendToken(user, 201, res);
  } catch (error) {
    next(error);
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