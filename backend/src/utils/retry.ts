import { logger } from './logger';

interface RetryConfig {
  maxAttempts: number;
  delay: number;
  backoffFactor: number;
}

export const defaultRetryConfig: RetryConfig = {
  maxAttempts: 3,
  delay: 1000, // Initial delay in milliseconds
  backoffFactor: 2 // Each retry will wait 2x longer
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig
): Promise<T> {
  let lastError: Error | null = null;
  let attempt = 1;
  let currentDelay = config.delay;

  while (attempt <= config.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === config.maxAttempts) {
        break;
      }

      logger.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}). Retrying in ${currentDelay}ms...`);
      logger.error('Error details:', lastError);

      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay *= config.backoffFactor;
      attempt++;
    }
  }

  throw new Error(`Operation failed after ${config.maxAttempts} attempts. Last error: ${lastError?.message}`);
}
