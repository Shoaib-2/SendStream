// backend/src/config/database.ts
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI!);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Add indexes
    await createIndexes();
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    // Subscriber indexes
    await mongoose.model('Subscriber').collection.createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { status: 1 } }
    ]);

    // Newsletter indexes
    await mongoose.model('Newsletter').collection.createIndexes([
      { key: { status: 1 } },
      { key: { scheduledDate: 1 } },
      { key: { createdAt: -1 } }
    ]);

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes:', error);
  }
};