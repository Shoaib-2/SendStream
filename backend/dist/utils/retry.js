"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRetryConfig = void 0;
exports.withRetry = withRetry;
const logger_1 = require("./logger");
exports.defaultRetryConfig = {
    maxAttempts: 3,
    delay: 1000, // Initial delay in milliseconds
    backoffFactor: 2 // Each retry will wait 2x longer
};
async function withRetry(operation, config = exports.defaultRetryConfig) {
    let lastError = null;
    let attempt = 1;
    let currentDelay = config.delay;
    while (attempt <= config.maxAttempts) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt === config.maxAttempts) {
                break;
            }
            logger_1.logger.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}). Retrying in ${currentDelay}ms...`);
            logger_1.logger.error('Error details:', lastError);
            await new Promise(resolve => setTimeout(resolve, currentDelay));
            currentDelay *= config.backoffFactor;
            attempt++;
        }
    }
    throw new Error(`Operation failed after ${config.maxAttempts} attempts. Last error: ${lastError?.message}`);
}
