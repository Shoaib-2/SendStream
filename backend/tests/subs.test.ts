// backend/tests/subs.test.ts
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app';
import Subscriber from '../src/models/Subscriber';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

describe('Subscriber Endpoints', () => {
    beforeAll(async () => {
      await mongoose.connect(process.env.TEST_DB_URI || 'mongodb://127.0.0.1:27017/newsletter-test', {
      });
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
        const csvContent = 'email,name\ntest@example.com,Test User';
  
        const res = await request(app)
          .post('/api/subscribers/import')
          .send({ csvData: csvContent });
  
        console.log('Response:', res.body); // Debug logging
  
        expect(res.status).toBe(201);
        expect(res.body.imported).toBe(1);
  
        const subscribers = await Subscriber.find();
        expect(subscribers).toHaveLength(1);
        expect(subscribers[0].email).toBe('test@example.com');
      });
    });
  });