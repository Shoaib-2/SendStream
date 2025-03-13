import { MongoClient, Db } from 'mongodb';
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

export async function connectToDatabase() {
  const client = await MongoClient.connect(uri);
  const db = client.db(dbName);
  
  return { client, db };
}