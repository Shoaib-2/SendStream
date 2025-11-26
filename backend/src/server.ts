// server.ts
import express, { RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { connectDB } from './config/database';
import authRoutes from './routes/auth.routes';
import cookieParser from 'cookie-parser'; // Add cookie-parser
import { Request, Response, NextFunction } from "express";
import { errorHandler } from './middleware/error.middleware';
import { corsConfig } from './config/cors.config';
import { helmetConfig } from './config/helmet.config';
import newsletterRoutes from './routes/newsletter.routes';
import subscriberRoutes from './routes/subscribers.route';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import analyticsRoutes from './routes/analytics.routes';
import settingsRoutes from './routes/settings.routes';
import healthRoutes from './routes/health.routes';
import jwt from 'jsonwebtoken';
import subscriptionRoutes from './routes/subscription.routes';
import stripeRoutes from './routes/stripe.routes';
import adminRoutes from './routes/admin.routes';
import { protect } from './middleware/auth/auth.middleware';
import { checkSubscription } from './middleware/susbcription.middleware';
import emailRoutes from './routes/email.routes';
import aiRoutes from './routes/ai.routes';
import mongoose from 'mongoose';

dotenv.config();

const app = express();

// Security middleware - must be early in the middleware chain
app.use(helmet(helmetConfig));

// CORS configuration
app.use(cors(corsConfig));

// Cookie parser (needed before routes)
app.use(cookieParser());

const server = createServer(app);
const wss = new WebSocketServer({ 
  server,
  path: '/ws' // Explicitly set WebSocket path
});

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

// Apply CORS config for WebSocket as well

// Apply CORS verification to WebSocket upgrade requests
wss.on('headers', (headers) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://send-stream.vercel.app',
    'https://backend-9h3q.onrender.com'
  ];
  const origin = headers.find(h => h.toLowerCase().startsWith('origin:'))?.split(': ')[1];
  if (origin && allowedOrigins.includes(origin)) {
    headers.push('Access-Control-Allow-Origin: ' + origin);
    headers.push('Access-Control-Allow-Credentials: true');
    headers.push('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
    headers.push('Access-Control-Allow-Headers: Content-Type, Authorization, Cookie, X-XSRF-TOKEN');
    headers.push('Access-Control-Expose-Headers: Set-Cookie, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
  }
});

// Add non-protected routes first (BEFORE body parsers for Stripe webhook raw body)
app.use('/api/stripe', stripeRoutes); // Stripe routes MUST be before express.json() for webhook raw body

// NOW add body parsing middleware (AFTER Stripe routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Other non-protected routes
app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

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
protectedRouter.use('/ai', aiRoutes);

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
    console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
    console.log('Available routes:');
    console.log(' - /api/stripe (webhook, checkout)');
    console.log(' - /api/auth');
    console.log(' - /api/subscribers');
    console.log(' - /api/newsletters');
    console.log(' - /api/subscription');
    console.log(' - /api/admin');
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
