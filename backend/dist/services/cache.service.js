"use strict";
/**
 * Cache Service - In-memory caching for performance optimization
 * This is a simple in-memory cache. For production with multiple instances,
 * consider using Redis or similar distributed caching solution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheKeys = exports.CacheService = void 0;
const logger_1 = require("../utils/logger");
class CacheService {
    constructor(defaultTTL = 5 * 60 * 1000) {
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
        // Cleanup expired entries every minute
        setInterval(() => this.cleanup(), 60 * 1000);
    }
    /**
     * Get value from cache
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    }
    /**
     * Set value in cache with optional TTL
     */
    set(key, data, ttl) {
        const expiresAt = Date.now() + (ttl || this.defaultTTL);
        this.cache.set(key, {
            data,
            expiresAt
        });
    }
    /**
     * Delete specific key from cache
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Delete all keys matching a pattern
     */
    deletePattern(pattern) {
        let count = 0;
        const regex = new RegExp(pattern);
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }
    /**
     * Clear all cache entries
     */
    clear() {
        this.cache.clear();
        logger_1.logger.info('Cache cleared');
    }
    /**
     * Get or set pattern - fetch from cache or execute function and cache result
     */
    async getOrSet(key, fetchFunction, ttl) {
        // Try to get from cache first
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        // Not in cache, fetch and store
        try {
            const data = await fetchFunction();
            this.set(key, data, ttl);
            return data;
        }
        catch (error) {
            logger_1.logger.error('Error in getOrSet cache operation:', error);
            throw error;
        }
    }
    /**
     * Remove expired entries from cache
     */
    cleanup() {
        const now = Date.now();
        let expiredCount = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                expiredCount++;
            }
        }
        if (expiredCount > 0) {
            logger_1.logger.debug(`Cleaned up ${expiredCount} expired cache entries`);
        }
    }
    /**
     * Get cache statistics
     */
    getStats() {
        const now = Date.now();
        let activeCount = 0;
        let expiredCount = 0;
        for (const entry of this.cache.values()) {
            if (now > entry.expiresAt) {
                expiredCount++;
            }
            else {
                activeCount++;
            }
        }
        return {
            totalEntries: this.cache.size,
            activeEntries: activeCount,
            expiredEntries: expiredCount,
            memoryUsage: process.memoryUsage()
        };
    }
    /**
     * Check if key exists and is not expired
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
}
exports.CacheService = CacheService;
// Cache key generators for common patterns
exports.CacheKeys = {
    userSettings: (userId) => `user:${userId}:settings`,
    subscriberCount: (userId) => `user:${userId}:subscriber:count`,
    newsletterStats: (userId) => `user:${userId}:newsletter:stats`,
    analyticsGrowth: (userId, period) => `user:${userId}:analytics:growth:${period}`,
    analyticsEngagement: (userId) => `user:${userId}:analytics:engagement`,
    mailchimpStatus: (userId) => `user:${userId}:mailchimp:status`,
};
// Export singleton instance
exports.cacheService = new CacheService();
