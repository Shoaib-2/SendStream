import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import express from 'express';
import Subscriber from '../src/models/Subscriber';
import User from '../src/models/User';
import subscriberRoutes from '../src/routes/subscribers';
import { jest, describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config({ path: '.env.test' });

// Create test app instance
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/subscribers', subscriberRoutes);

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

      expect(res.status).toBe(204);

      const deletedSubscriber = await Subscriber.findById(subscriber._id);
      expect(deletedSubscriber).toBeNull();
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
