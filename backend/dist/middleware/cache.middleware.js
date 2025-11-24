"use strict";
/**
 * Cache Middleware - HTTP response caching
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheInvalidationPatterns = exports.cacheKeyGenerators = exports.invalidateCacheMiddleware = exports.cacheMiddleware = void 0;
const cache_service_1 = require("../services/cache.service");
const logger_1 = require("../utils/logger");
/**
 * Middleware to cache GET request responses
 */
const cacheMiddleware = (options = {}) => {
    const { ttl = 5 * 60 * 1000, // Default 5 minutes
    keyGenerator = defaultKeyGenerator, condition = () => true } = options;
    return async (req, res, next) => {
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
        const cachedResponse = cache_service_1.cacheService.get(cacheKey);
        if (cachedResponse) {
            logger_1.logger.debug(`Cache HIT: ${cacheKey}`);
            // Set cache header
            res.setHeader('X-Cache', 'HIT');
            return res.status(cachedResponse.status || 200).json(cachedResponse.data);
        }
        logger_1.logger.debug(`Cache MISS: ${cacheKey}`);
        res.setHeader('X-Cache', 'MISS');
        // Store original json method
        const originalJson = res.json.bind(res);
        // Override json method to cache the response
        res.json = function (data) {
            // Cache the response
            cache_service_1.cacheService.set(cacheKey, {
                status: res.statusCode,
                data
            }, ttl);
            // Call original json method
            return originalJson(data);
        };
        next();
    };
};
exports.cacheMiddleware = cacheMiddleware;
/**
 * Default cache key generator
 */
function defaultKeyGenerator(req) {
    const userId = req.user?._id || 'anonymous';
    const path = req.path;
    const query = JSON.stringify(req.query);
    return `http:${userId}:${path}:${query}`;
}
/**
 * Middleware to invalidate cache on mutations (POST, PUT, PATCH, DELETE)
 */
const invalidateCacheMiddleware = (patterns) => {
    return (req, res, next) => {
        // Only invalidate on mutation methods
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            return next();
        }
        // Store original json method
        const originalJson = res.json.bind(res);
        // Override json to invalidate cache after successful response
        res.json = function (data) {
            // Only invalidate on successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const patternsToInvalidate = typeof patterns === 'function'
                    ? patterns(req)
                    : patterns;
                patternsToInvalidate.forEach(pattern => {
                    const count = cache_service_1.cacheService.deletePattern(pattern);
                    if (count > 0) {
                        logger_1.logger.debug(`Invalidated ${count} cache entries matching: ${pattern}`);
                    }
                });
            }
            return originalJson(data);
        };
        next();
    };
};
exports.invalidateCacheMiddleware = invalidateCacheMiddleware;
/**
 * Cache key generators for specific routes
 */
exports.cacheKeyGenerators = {
    subscriberList: (req) => {
        const userId = req.user?._id;
        const page = req.query.page || 1;
        const limit = req.query.limit || 100;
        return `subscribers:${userId}:page:${page}:limit:${limit}`;
    },
    newsletterList: (req) => {
        const userId = req.user?._id;
        return `newsletters:${userId}:list`;
    },
    analyticsGrowth: (req) => {
        const userId = req.user?._id;
        const period = req.query.period || '30';
        return `analytics:${userId}:growth:${period}`;
    },
    settings: (req) => {
        const userId = req.user?._id;
        return `settings:${userId}`;
    }
};
/**
 * Cache invalidation patterns for specific operations
 */
exports.cacheInvalidationPatterns = {
    subscriber: (req) => {
        const userId = req.user?._id;
        return [
            `subscribers:${userId}:.*`,
            `analytics:${userId}:.*`,
            `user:${userId}:subscriber:count`
        ];
    },
    newsletter: (req) => {
        const userId = req.user?._id;
        return [
            `newsletters:${userId}:.*`,
            `analytics:${userId}:.*`,
            `user:${userId}:newsletter:stats`
        ];
    },
    settings: (req) => {
        const userId = req.user?._id;
        return [
            `settings:${userId}`,
            `user:${userId}:.*`
        ];
    }
};
