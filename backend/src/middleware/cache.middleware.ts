/**
 * Cache Middleware - HTTP response caching
 */

import { Request, Response, NextFunction } from 'express';
import { cacheService } from '../services/cache.service';
import { logger } from '../utils/logger';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request) => boolean; // Cache only if condition is true
}

/**
 * Middleware to cache GET request responses
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = 5 * 60 * 1000, // Default 5 minutes
    keyGenerator = defaultKeyGenerator,
    condition = () => true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Check condition
    if (!condition(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator(req);

    // Try to get from cache
    const cachedResponse = cacheService.get<any>(cacheKey);
    
    if (cachedResponse) {
      logger.debug(`Cache HIT: ${cacheKey}`);
      
      // Set cache header
      res.setHeader('X-Cache', 'HIT');
      
      return res.status(cachedResponse.status || 200).json(cachedResponse.data);
    }

    logger.debug(`Cache MISS: ${cacheKey}`);
    res.setHeader('X-Cache', 'MISS');

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache the response
    res.json = function(data: any) {
      // Cache the response
      cacheService.set(cacheKey, {
        status: res.statusCode,
        data
      }, ttl);

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

/**
 * Default cache key generator
 */
function defaultKeyGenerator(req: Request): string {
  const userId = req.user?._id || 'anonymous';
  const path = req.path;
  const query = JSON.stringify(req.query);
  
  return `http:${userId}:${path}:${query}`;
}

/**
 * Middleware to invalidate cache on mutations (POST, PUT, PATCH, DELETE)
 */
export const invalidateCacheMiddleware = (patterns: string[] | ((req: Request) => string[])) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only invalidate on mutation methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to invalidate cache after successful response
    res.json = function(data: any) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patternsToInvalidate = typeof patterns === 'function' 
          ? patterns(req) 
          : patterns;

        patternsToInvalidate.forEach(pattern => {
          const count = cacheService.deletePattern(pattern);
          if (count > 0) {
            logger.debug(`Invalidated ${count} cache entries matching: ${pattern}`);
          }
        });
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Cache key generators for specific routes
 */
export const cacheKeyGenerators = {
  subscriberList: (req: Request) => {
    const userId = req.user?._id;
    const page = req.query.page || 1;
    const limit = req.query.limit || 100;
    return `subscribers:${userId}:page:${page}:limit:${limit}`;
  },

  newsletterList: (req: Request) => {
    const userId = req.user?._id;
    return `newsletters:${userId}:list`;
  },

  analyticsGrowth: (req: Request) => {
    const userId = req.user?._id;
    const period = req.query.period || '30';
    return `analytics:${userId}:growth:${period}`;
  },

  settings: (req: Request) => {
    const userId = req.user?._id;
    return `settings:${userId}`;
  }
};

/**
 * Cache invalidation patterns for specific operations
 */
export const cacheInvalidationPatterns = {
  subscriber: (req: Request) => {
    const userId = req.user?._id;
    return [
      `subscribers:${userId}:.*`,
      `analytics:${userId}:.*`,
      `user:${userId}:subscriber:count`
    ];
  },

  newsletter: (req: Request) => {
    const userId = req.user?._id;
    return [
      `newsletters:${userId}:.*`,
      `analytics:${userId}:.*`,
      `user:${userId}:newsletter:stats`
    ];
  },

  settings: (req: Request) => {
    const userId = req.user?._id;
    return [
      `settings:${userId}`,
      `user:${userId}:.*`
    ];
  }
};
