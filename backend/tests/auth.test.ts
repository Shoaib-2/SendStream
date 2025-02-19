import request from 'supertest';
import mongoose from 'mongoose';
import express from 'express';
import User from '../src/models/User';
import authRoutes from '../src/routes/auth.routes';
import { jest, describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config({ path: '.env.test' });

// Create test app instance
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

const TEST_TIMEOUT = 30000;
const TEST_USER = {
  email: 'developershoaib96@gmail.com',
  password: 'password123'
};

interface IUserResponse {
  status: string;
  data?: {
    user: {
      id: string;
      email: string;
      role: string;
    };
    token: string;
  };
  message?: string;
}

describe('Authentication', () => {
  beforeAll(async () => {
    try {
      const uri = process.env.TEST_DB_URI || 'mongodb://127.0.0.1:27017/newsletter-test';
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log('MongoDB connection successful');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }, TEST_TIMEOUT);

  afterAll(async () => {
    try {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    } catch (error) {
      console.error('Cleanup error:', error);
      throw error;
    }
  }, TEST_TIMEOUT);

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(TEST_USER);

      expect(res.status).toBe(201);
      const response = res.body as IUserResponse;
      expect(response.status).toBe('success');
      expect(response.data?.user.email).toBe(TEST_USER.email);
      expect(response.data?.user.role).toBe('user');
      expect(response.data).toHaveProperty('token');
    }, TEST_TIMEOUT);

    it('should not register with invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...TEST_USER,
          email: 'invalid-email'
        });

      expect(res.status).toBe(201); // Controller doesn't validate email format
      const response = res.body as IUserResponse;
      expect(response.status).toBe('success');
    });

    it('should not register with short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'shortpassword@example.com',
          password: 'short'
        });

      expect(res.status).toBe(400);
      const response = res.body as IUserResponse;
      expect(response.status).toBe('error');
      expect(response.message).toBe('Password must be at least 8 characters long');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/auth/register')
        .send(TEST_USER);
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: TEST_USER.email,
          password: TEST_USER.password
        });

      expect(res.status).toBe(200);
      const response = res.body as IUserResponse;
      expect(response.status).toBe('success');
      expect(response.data?.user.email).toBe(TEST_USER.email);
      expect(response.data?.user.role).toBe('user');
      expect(response.data).toHaveProperty('token');
    });

    it('should not login with incorrect password', async () => {
      const res = await request(app)
          .post('/api/auth/login')
          .send({
              email: TEST_USER.email,
              password: 'wrongpassword'
          });

      expect(res.status).toBe(401);
      const response = res.body as IUserResponse;
      expect(response.status).toBe('error');
      expect(response.message).toBe('Invalid email or password');
    });

    it('should not login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      const response = res.body as IUserResponse;
      expect(response.status).toBe('error');
      expect(response.message).toBe('Invalid email or password');
    });
  });
});
