import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import express, { Request, Response, NextFunction } from 'express';
import Subscriber from '../src/models/Subscriber';
import User from '../src/models/User';
import subscriberRoutes from '../src/routes/subscribers.route';
import { jest, describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import dotenv from 'dotenv';
import cors from 'cors';
import { errorHandler } from '../src/middleware/error.middleware';
import jwt from 'jsonwebtoken';
import { Model } from 'mongoose';
import { ISettings } from '../src/models/Settings';

// Mock the server's broadcastSubscriberUpdate function
jest.mock('../src/server', () => ({
  broadcastSubscriberUpdate: jest.fn()
}));

// Mock the auth middleware
jest.mock('../src/middleware/auth/auth.middleware', () => ({
  protect: (req: any, res: any, next: any) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ status: 'error', message: 'No token provided' });
    }
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
      req.user = { _id: (decoded as any).id };
      next();
    } catch (error) {
      return res.status(401).json({ status: 'error', message: 'Invalid token' });
    }
  }
}));

// Mock the logger
jest.mock('../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

// Mock Settings model
jest.mock('../src/models/Settings', () => {
  return {
    findOne: jest.fn().mockImplementation(() => Promise.resolve())
  } as Partial<Model<ISettings>>;
});

dotenv.config({ path: '.env.test' });

// Create test app instance
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/subscribers', subscriberRoutes);
// Add error handling middleware properly
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler(err, req, res, next);
});

// Test user credentials
const TEST_USER = {
  email: 'developershoaib96@gmail.com',
  password: 'password123'
};

type UserDocument = {
  _id: Types.ObjectId;
  email: string;
  password: string;
  role: string;
  generateToken(): string;
};

interface ISubscriberResponse {
  status: string;
  data?: any;
  message?: string;
  imported?: number;
  duplicates?: number;
}

describe('Subscriber Endpoints', () => {
  let authToken: string;
  let testUser: UserDocument;

  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_DB_URI || 'mongodb://127.0.0.1:27017/newsletter-test');
    
    const user = await User.create(TEST_USER);
    testUser = {
      _id: user._id as Types.ObjectId,
      email: user.email,
      password: user.password,
      role: 'user',
      generateToken: user.generateToken.bind(user)
    };
    
    authToken = testUser.generateToken();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Subscriber.deleteMany({});
    jest.clearAllMocks();
  });

  describe('POST /api/subscribers/import', () => {
    it('should import subscribers from CSV', async () => {
      const csvContent = `email,name\ntest@example.com,Test User`;
  
      const res = await request(app)
        .post('/api/subscribers/import')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          csvData: csvContent,
          createdBy: testUser._id 
        });
  
      expect(res.status).toBe(201);
      const response = res.body as ISubscriberResponse;
      expect(response.status).toBe('success');
      expect(response.imported).toBe(1);
    });
  
    it('should handle invalid CSV data', async () => {
      const invalidCsvContent = 'invalid,csv\ndata';
  
      const res = await request(app)
        .post('/api/subscribers/import')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ csvData: invalidCsvContent });
  
      expect(res.status).toBe(400);
      const response = res.body as ISubscriberResponse;
      expect(response.status).toBe('error');
      expect(response.message).toBe('CSV parsing error');
    });
  });

  describe('GET /api/subscribers', () => {
    it('should list all subscribers', async () => {
      // Create test subscriber
      const subscriber = await Subscriber.create({
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
        createdBy: testUser._id
      });

      const res = await request(app)
        .get('/api/subscribers')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const response = res.body as ISubscriberResponse;
      expect(response.status).toBe('success');
      expect(response.data).toHaveLength(1);
      expect(response.data[0].email).toBe('test@example.com');
      expect(response.data[0].id).toBe(subscriber._id.toString());
      expect(response.data[0].createdBy._id).toBe(testUser._id.toString());
    });
  });

  describe('DELETE /api/subscribers/:id', () => {
    it('should delete a subscriber', async () => {
      const subscriber = await Subscriber.create({
        email: 'test@example.com',
        name: 'Test User',
        status: 'active',
        createdBy: testUser._id
      });

      const res = await request(app)
        .delete(`/api/subscribers/${subscriber._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('unsubscribed');
    });

    it('should handle non-existent subscriber', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/subscribers/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Subscriber not found');
    });
  });
});
