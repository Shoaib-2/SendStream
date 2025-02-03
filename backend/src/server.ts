import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Request, Response } from "express";

dotenv.config();

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());

app.get('/api/analytics/summary', (req: Request, res: Response) => {
  res.json({
    subscribers: { total: 1234, change: 12.5 },
    newsletters: { total: 45, change: -2.4 },
    openRate: { value: 68, change: 8.2 }
  });
});

app.get('/api/analytics/growth', (req: Request, res: Response) => {
  res.json([
    { date: '2024-01', subscribers: 1000 },
    { date: '2024-02', subscribers: 1200 }
  ]);
});

app.get('/api/analytics/engagement', (req: Request, res: Response) => {
  res.json({
    openRate: 68,
    clickRate: 23
  });
});

const PORT = process.env.PORT || 5000;

const mongoUri = process.env.MONGODB_URI;


if (!mongoUri) {
  console.error('MongoDB connection error: MONGODB_URI is not defined');
  process.exit(1);
}

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err: unknown) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

module.exports = app;