import { MongoClient, Db } from 'mongodb';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const uri = process.env.MONGODB_URI as string;
const dbName = process.env.MONGODB_DATABASE as string;

if (!uri) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

if (!dbName) {
  throw new Error('Please define the MONGODB_DATABASE environment variable');
}

let clientPromise: Promise<MongoClient>;
let mongooseConnection: Promise<typeof mongoose>;

// MongoDB Native Client connection (keep for legacy code)
export async function connectToDatabase() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);
  return { client, db };
}

// Mongoose connection for API routes
export async function connectMongoose() {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose;
    }

    if (!mongooseConnection) {
      mongooseConnection = mongoose.connect(uri, {
        bufferCommands: false,
      });
    }
    return await mongooseConnection;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Handle cleanup
if (process.env.NODE_ENV !== 'production') {
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
      process.exit(1);
    }
  });
}