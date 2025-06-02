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
import healthRoutes from './routes/health.routes';
import jwt from 'jsonwebtoken';
import subscriptionRoutes from './routes/subscription.routes';
import { protect } from './middleware/auth/auth.middleware';
import { checkSubscription } from './middleware/susbcription.middleware';
import emailRoutes from './routes/email.routes';
import mongoose from 'mongoose';

dotenv.config();

const app = express();

// Configure CORS
app.use(cors({
  origin: '*', // Allow all origins during testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Add body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
  origin: process.env.CLIENT_URL,
  credentials: true,  // Important for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Apply CORS verification to WebSocket upgrade requests
wss.on('headers', (headers) => {  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) {
    console.error('CLIENT_URL environment variable is not configured');
    return;
  }
  headers.push('Access-Control-Allow-Origin: ' + clientUrl);
  headers.push('Access-Control-Allow-Credentials: true'); // Add for cookies
});


app.use(express.json());
app.use(cookieParser()); // Added cookie-parser middleware

// Add non-protected routes first
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/subscription', subscriptionRoutes); // Add subscription routes before protection

// Apply protection middleware to all other routes
const protectedRouter = express.Router();
protectedRouter.use(protect as RequestHandler);
protectedRouter.use(checkSubscription as RequestHandler);

// Add protected routes
protectedRouter.use('/newsletters', newsletterRoutes);
protectedRouter.use('/subscribers', subscriberRoutes);
protectedRouter.use('/analytics', analyticsRoutes);
protectedRouter.use('/settings', settingsRoutes);
protectedRouter.use('/email', emailRoutes);

// Mount the protected router under /api
app.use('/api', protectedRouter);


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
