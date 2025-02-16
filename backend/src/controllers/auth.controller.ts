// auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { APIError } from '../utils/errors';

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    if (!email || !password) {
      console.log('Missing credentials');
      throw new APIError(400, 'Please provide email and password');
    }

    // Explicitly include password in the query
    const user = await User.findOne({ email }).select('+password');
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.log('No user found with email:', email);
      throw new APIError(401, 'Invalid email or password');
    }

    // Debug password comparison
    console.log('Attempting password comparison');
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password comparison result:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Invalid password for user:', email);
      throw new APIError(401, 'Invalid email or password');
    }

    const token = user.generateToken();
    console.log('Login successful, token generated');

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    console.log('Registration attempt for email:', email);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      throw new APIError(400, 'Email already in use');
    }

    const user = await User.create({
      email,
      password, // Password will be hashed by the pre-save middleware
      role: 'user'
    });

    console.log('User created successfully:', email);

    const token = user.generateToken();

    res.status(201).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    next(error);
  }
};