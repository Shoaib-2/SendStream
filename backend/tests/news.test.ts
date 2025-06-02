import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import express from 'express';
import Newsletter from '../src/models/Newsletter';
import User from '../src/models/User';
import newsletterRoutes from '../src/routes/newsletter.routes';
import authRoutes from '../src/routes/auth.routes';
import subscriberRoutes from '../src/routes/subscribers.route';
import analyticsRoutes from '../src/routes/analytics.routes';
import settingsRoutes from '../src/routes/settings.routes';
import { jest, describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config({ path: '.env.test' });

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/newsletters', newsletterRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);

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

describe('Newsletter Endpoints', () => {
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
    await Newsletter.deleteMany({});
  });

  describe('POST /api/newsletters', () => {
    it('creates newsletter', async () => {
      const newsletterData = {
        title: 'Test Newsletter',
        content: 'Test content',
        subject: 'Test Subject',
        createdBy: testUser._id,
        status: 'draft'
      };

      const res = await request(app)
        .post('/api/newsletters')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newsletterData);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('title', newsletterData.title);
      expect(res.body.data).toHaveProperty('status', 'draft');
      expect(res.body.data.createdBy.toString()).toBe(testUser._id.toString());
    });
  });

  describe('PATCH /api/newsletters/:id/schedule', () => {
    it('schedules newsletter', async () => {
      // Create test newsletter
      const newsletter = await Newsletter.create({
        title: 'Test',
        content: 'Content',
        subject: 'Test Subject',
        createdBy: testUser._id,
        status: 'draft'
      });

      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + 1); // Tomorrow

      const res = await request(app)
        .post(`/api/newsletters/${newsletter._id}/schedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scheduledDate: scheduleDate });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('scheduled');
      expect(new Date(res.body.data.scheduledDate)).toEqual(scheduleDate);
    });

    it('fails to schedule with past date', async () => {
      const newsletter = await Newsletter.create({
        title: 'Test',
        content: 'Content',
        subject: 'Test Subject',
        createdBy: testUser._id,
        status: 'draft'
      });
  
      const pastDate = new Date();
      pastDate.setMinutes(pastDate.getMinutes() - 1); // Set to 1 minute in the past
  
      const res = await request(app)
        .post(`/api/newsletters/${newsletter._id}/schedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scheduledDate: pastDate });
  
      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Scheduled date must be in the future');
    });
  
    it('fails to schedule non-existent newsletter', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + 1);
  
      const res = await request(app)
        .post(`/api/newsletters/${nonExistentId}/schedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scheduledDate: scheduleDate });
  
      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Newsletter not found');
    });
  });
});
