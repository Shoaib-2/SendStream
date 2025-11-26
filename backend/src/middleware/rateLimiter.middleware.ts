/**
 * Enhanced API Rate Limiting Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitStore {
  [key: string]: {
    requests: number[];
    blocked: boolean;
    blockExpiry?: number;
  };
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  handler?: (req: Request, res: Response) => void;
  blockDuration?: number; // How long to block after exceeding limit (ms)
}

const store: RateLimitStore = {};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    const entry = store[key];
    
    // Remove expired blocks
    if (entry.blocked && entry.blockExpiry && entry.blockExpiry < now) {
      entry.blocked = false;
      entry.blockExpiry = undefined;
    }
    
    // Remove empty entries
    if (entry.requests.length === 0 && !entry.blocked) {
      delete store[key];
    }
  });
}, 60 * 1000); // Clean every minute

/**
 * Default key generator - uses IP address and authenticated user ID
 */
const defaultKeyGenerator = (req: Request): string => {
  const userId = req.user?._id || 'anonymous';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `${userId}:${ip}`;
};

/**
 * Create rate limiter middleware
 */
export const createRateLimiter = (options: RateLimitOptions) => {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator,
    handler,
    blockDuration = 0
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Initialize store entry if it doesn't exist
    if (!store[key]) {
      store[key] = { requests: [], blocked: false };
    }

    const entry = store[key];

    // Check if blocked
    if (entry.blocked && entry.blockExpiry && entry.blockExpiry > now) {
      const retryAfter = Math.ceil((entry.blockExpiry - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', new Date(entry.blockExpiry).toISOString());

      logger.warn(`Rate limit block active for ${key}`);

      if (handler) {
        return handler(req, res);
      }

      return res.status(statusCode).json({
        status: 'error',
        message: `${message} Blocked until ${new Date(entry.blockExpiry).toISOString()}`,
        retryAfter
      });
    }

    // Remove old requests outside the window
    entry.requests = entry.requests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (entry.requests.length >= max) {
      const oldestRequest = entry.requests[0];
      const resetTime = new Date(oldestRequest + windowMs);
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

      // Set rate limit headers
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

      // Block if blockDuration is set
      if (blockDuration > 0) {
        entry.blocked = true;
        entry.blockExpiry = now + blockDuration;
        logger.warn(`Rate limit exceeded for ${key}. Blocking for ${blockDuration}ms`);
      } else {
        logger.warn(`Rate limit exceeded for ${key}`);
      }

      if (handler) {
        return handler(req, res);
      }

      return res.status(statusCode).json({
        status: 'error',
        message,
        retryAfter
      });
    }

    // Add current request to the store
    entry.requests.push(now);

    // Set rate limit headers
    const remaining = max - entry.requests.length;
    const resetTime = new Date(now + windowMs);
    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime.toISOString());

    // Handle successful/failed request tracking
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalJson = res.json.bind(res);
      res.json = function (data: any) {
        const shouldSkip =
          (skipSuccessfulRequests && res.statusCode >= 200 && res.statusCode < 300) ||
          (skipFailedRequests && res.statusCode >= 400);

        if (shouldSkip && entry.requests.length > 0) {
          entry.requests.pop(); // Remove the current request
        }

        return originalJson(data);
      };
    }

    next();
  };
};

/**
 * Predefined rate limiters for different routes
 */
export const rateLimiters = {
  // General API rate limit - 100 requests per 15 minutes
  api: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
  }),

  // Auth routes - 5 requests per 15 minutes (stricter for security)
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many authentication attempts, please try again later.',
    blockDuration: 30 * 60 * 1000, // Block for 30 minutes after exceeding
    skipSuccessfulRequests: true
  }),

  // Authenticated users - 200 requests per 15 minutes
  authenticated: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Request limit reached, please slow down.'
  }),

  // Email sending - 10 per minute
  email: createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Email rate limit exceeded, please wait before sending more.'
  }),

  // File upload - 20 per hour
  upload: createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: 'Upload limit exceeded, please try again later.'
  }),

  // Analytics/Stats - higher limit as they're read-only
  analytics: createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 100,
    message: 'Analytics request limit exceeded.'
  }),

  // AI endpoints - 10 requests per hour (free tier optimization)
  ai: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'AI request limit reached. You can make 10 AI requests per hour. Please try again later.',
    blockDuration: 60 * 60 * 1000 // Block for 1 hour after exceeding
  })
};

/**
 * IP-based rate limiter (doesn't consider authentication)
 */
export const ipRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown'
});
