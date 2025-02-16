import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import Newsletter from '../src/models/Newsletter';
import User from '../src/models/User';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

describe('Newsletter Endpoints', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_DB_URI || 'mongodb://127.0.0.1:27017/newsletter-test');
    
    testUser = await User.create({
      email: 'test@example.com',
      password: 'password123',
      role: 'admin'
    });

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
      const res = await request(app)
        .post('/api/newsletters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Newsletter',
          content: 'Test content',
          subject: 'Test Subject',
          createdBy: testUser._id
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('title', 'Test Newsletter');
    });
  });

  describe('PATCH /api/newsletters/:id/schedule', () => {
    it('schedules newsletter', async () => {
      // Create test newsletter
      const newsletter = new Newsletter({
        title: 'Test',
        content: 'Content',
        subject: 'Test Subject',
        createdBy: testUser._id
      });
      await newsletter.save();

      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + 1);

      const res = await request(app)
        .post(`/api/newsletters/${newsletter._id}/schedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ scheduledDate: scheduleDate });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('scheduled');
    });
  });
});