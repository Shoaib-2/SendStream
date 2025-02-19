import { logger } from './logger';

interface RateLimiterConfig {
  maxRequests: number;  // Maximum requests allowed
  interval: number;     // Time window in milliseconds
  concurrency: number;  // Maximum concurrent requests
}

export class RateLimiter {
  private timestamps: number[] = [];
  private activeRequests: number = 0;
  private queue: (() => void)[] = [];

  constructor(private config: RateLimiterConfig = {
    maxRequests: 10,    // Default: 10 requests
    interval: 1000,     // Default: per second
    concurrency: 3      // Default: 3 concurrent requests
  }) {}

  private removeOldTimestamps() {
    const now = Date.now();
    const windowStart = now - this.config.interval;
    this.timestamps = this.timestamps.filter(timestamp => timestamp > windowStart);
  }

  private processQueue() {
    if (this.queue.length > 0 && this.activeRequests < this.config.concurrency) {
      const next = this.queue.shift();
      if (next) {
        this.activeRequests++;
        next();
      }
    }
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      const tryAcquire = () => {
        this.removeOldTimestamps();

        if (
          this.timestamps.length < this.config.maxRequests &&
          this.activeRequests < this.config.concurrency
        ) {
          this.timestamps.push(Date.now());
          this.activeRequests++;
          resolve();
        } else {
          this.queue.push(tryAcquire);
          
          // Log warning if queue is getting long
          if (this.queue.length > this.config.maxRequests) {
            logger.warn(`Rate limiter queue size: ${this.queue.length}`);
          }
        }
      };

      tryAcquire();
    });
  }

  release(): void {
    this.activeRequests--;
    this.processQueue();
  }

  async withRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    try {
      await this.acquire();
      return await operation();
    } finally {
      this.release();
    }
  }
}

// Export a default instance with Mailchimp-specific configuration
export const mailchimpRateLimiter = new RateLimiter({
  maxRequests: 10,   // Mailchimp's standard rate limit
  interval: 1000,    // per second
  concurrency: 3     // Maximum concurrent requests
});
