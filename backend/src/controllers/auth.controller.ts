// backend/src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { APIError } from '../utils/errors';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new APIError(400, 'Email already in use');
    }

    const user = await User.create({
      email,
      password,
      role: 'user'
    });

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
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new APIError(400, 'Please provide email and password');
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new APIError(401, 'Invalid email or password');
    }

    const token = user.generateToken();

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
    next(error);
  }
};