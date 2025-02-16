import request from 'supertest';
import mongoose from 'mongoose';
import User from '../src/models/User';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import dotenv from 'dotenv';


dotenv.config({ path: '.env.test' });

const TEST_TIMEOUT = 30000; // Increased timeout to 30 seconds

describe('Authentication', () => {
  beforeAll(async () => {
    try {
      const uri = process.env.TEST_DB_URI;
      if (!uri) {
        throw new Error('TEST_DB_URI is not defined');
      }
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
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('token');
    }, TEST_TIMEOUT);

    it('should not login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
    });
  });
});
