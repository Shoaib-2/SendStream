// backend/utils/test-helpers.ts
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

export function generateTestToken() {
  const payload = { userId: 'test_user_id', email: 'test@example.com' };
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '48h' });
}
