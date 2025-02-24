// server.ts
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import { Request, Response, NextFunction } from "express";
import { errorHandler } from './middleware/error.middleware';
import newsletterRoutes from './routes/newsletter.routes';
import subscriberRoutes from './routes/subscribers';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import analyticsRoutes from './routes/analytics.routes';
import settingsRoutes from './routes/settings.routes';
import jwt from 'jsonwebtoken';
import { protect } from './middleware/auth/auth.middleware';

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
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Apply CORS verification to WebSocket upgrade requests
wss.on('headers', (headers) => {
  headers.push('Access-Control-Allow-Origin: ' + (process.env.CLIENT_URL || 'http://localhost:3000'));
});


app.use(express.json());

app.use((req, _res, next) => {
 console.log(`${req.method} ${req.path}`);
 next();
});

app.use('/api/auth', authRoutes);
app.use('/api/newsletters', newsletterRoutes);
app.use('/api/subscribers', subscriberRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);



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
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/newsletter';

mongoose
 .connect(mongoUri)
 .then(() => {
   console.log('MongoDB connected successfully');
   server.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
     console.log('WebSocket server initialized on port', PORT);
     console.log('Available routes:');
     console.log(' - /api/auth');
     console.log(' - /api/subscribers');
     console.log(' - /api/newsletters');
   });
 });

mongoose.connection.on('error', (err) => {
 console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
 console.warn('MongoDB disconnected');
});

export { wss, broadcastSubscriberUpdate };
