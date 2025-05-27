// backend/src/config/database.ts
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

// Connection ready state
let isConnected = false;

export const connectDB = async () => {
  try {
    if (isConnected) {
      logger.info('Using existing database connection');
      return;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection errors
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      isConnected = false;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        logger.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

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