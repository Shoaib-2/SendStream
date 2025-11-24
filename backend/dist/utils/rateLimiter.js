"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailchimpRateLimiter = exports.RateLimiter = void 0;
const logger_1 = require("./logger");
class RateLimiter {
    constructor(config = {
        maxRequests: 10, // Default: 10 requests
        interval: 1000, // Default: per second
        concurrency: 3 // Default: 3 concurrent requests
    }) {
        this.config = config;
        this.timestamps = [];
        this.activeRequests = 0;
        this.queue = [];
    }
    removeOldTimestamps() {
        const now = Date.now();
        const windowStart = now - this.config.interval;
        this.timestamps = this.timestamps.filter(timestamp => timestamp > windowStart);
    }
    processQueue() {
        if (this.queue.length > 0 && this.activeRequests < this.config.concurrency) {
            const next = this.queue.shift();
            if (next) {
                this.activeRequests++;
                next();
            }
        }
    }
    async acquire() {
        return new Promise((resolve) => {
            const tryAcquire = () => {
                this.removeOldTimestamps();
                if (this.timestamps.length < this.config.maxRequests &&
                    this.activeRequests < this.config.concurrency) {
                    this.timestamps.push(Date.now());
                    this.activeRequests++;
                    resolve();
                }
                else {
                    this.queue.push(tryAcquire);
                    // Log warning if queue is getting long
                    if (this.queue.length > this.config.maxRequests) {
                        logger_1.logger.warn(`Rate limiter queue size: ${this.queue.length}`);
                    }
                }
            };
            tryAcquire();
        });
    }
    release() {
        this.activeRequests--;
        this.processQueue();
    }
    async withRateLimit(operation) {
        try {
            await this.acquire();
            return await operation();
        }
        finally {
            this.release();
        }
    }
}
exports.RateLimiter = RateLimiter;
// Export a default instance with Mailchimp-specific configuration
exports.mailchimpRateLimiter = new RateLimiter({
    maxRequests: 10, // Mailchimp's standard rate limit
    interval: 1000, // per second
    concurrency: 3 // Maximum concurrent requests
});
