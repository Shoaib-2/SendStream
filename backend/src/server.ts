// server.ts
import express, { RequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import authRoutes from './routes/auth.routes';
import cookieParser from 'cookie-parser'; // Add cookie-parser
import { Request, Response, NextFunction } from "express";
import { errorHandler } from './middleware/error.middleware';
import newsletterRoutes from './routes/newsletter.routes';
import subscriberRoutes from './routes/subscribers.route';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import analyticsRoutes from './routes/analytics.routes';
import settingsRoutes from './routes/settings.routes';
import jwt from 'jsonwebtoken';
import subscriptionRoutes from './routes/subscription.routes';
import { protect } from '../src/middleware/auth/auth.middleware'; // Make sure this exists
import { checkSubscription } from '../src/middleware/susbcription.middleware';
import emailRoutes from './routes/email.routes';
import mongoose from 'mongoose';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  try {
    // Verify JWT token from query params
    const token = req.url?.split('token=')[1];
    if (!token) {
      ws.close(1008, 'Authentication required');
      return;
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err) => {
      if (err) {
        ws.close(1008, 'Invalid token');
        return;
      }

      // Send connection confirmation
      ws.send(JSON.stringify({ type: 'connection_established' }));
    });
  } catch (error) {
    console.error('WebSocket connection error:', error);
  }
});

// Broadcast function to notify all connected clients
const broadcastSubscriberUpdate = (subscriberId: string, status: string) => {
  const message = JSON.stringify({
    type: 'subscriber_update',
    data: {
      id: subscriberId,
      status
    }
  });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Configure CORS for both HTTP and WebSocket
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,  // Important for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Apply CORS verification to WebSocket upgrade requests
wss.on('headers', (headers) => {
  headers.push('Access-Control-Allow-Origin: ' + (process.env.CLIENT_URL || 'http://localhost:3000'));
  headers.push('Access-Control-Allow-Credentials: true'); // Add for cookies
});


app.use(express.json());
app.use(cookieParser()); // Added cookie-parser middleware

app.use('/api', protect as RequestHandler); // Apply auth middleware to all API routes
app.use('/api', checkSubscription as RequestHandler); // Apply subscription check after auth

// app.use((req, _res, next) => {
//  console.log(`${req.method} ${req.path}`);
//  next();
// });

app.use('/api/auth', authRoutes);
app.use('/api', emailRoutes);
app.use('/api/newsletters', newsletterRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/subscription', subscriptionRoutes); 


app.use((req: Request, res: Response) => {
 console.log(`404 - Not Found: ${req.method} ${req.originalUrl}`);
 res.status(404).json({
   status: 'error',
   message: `Route ${req.originalUrl} not found`
 });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
 errorHandler(err, req, res, next);
});

const PORT = process.env.PORT || 5000;

// Initialize database connection before starting server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('WebSocket server initialized on port', PORT);
    console.log('Available routes:');
    console.log(' - /api/auth');
    console.log(' - /api/subscribers');
    console.log(' - /api/newsletters');
    console.log(' - /api/subscription'); 
  });
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

mongoose.connection.on('error', (err) => {
 console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
 console.warn('MongoDB disconnected');
});

export { wss, broadcastSubscriberUpdate };
