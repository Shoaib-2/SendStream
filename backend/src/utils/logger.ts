// backend/src/utils/logger.ts
import winston from 'winston';

// Create a custom format for logging
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
 return `${timestamp} [${level}]: ${message}`;
});

// Create the logger
export const logger = winston.createLogger({
 format: winston.format.combine(
   winston.format.timestamp(),
   winston.format.colorize(),
   customFormat
 ),
 transports: [
   // Console transport for development
   new winston.transports.Console(),
   
   // File transport for errors
   new winston.transports.File({ 
     filename: 'logs/error.log', 
     level: 'error' 
   }),
   
   // File transport for all logs
   new winston.transports.File({ 
     filename: 'logs/combined.log' 
   })
 ]
});

// Add environment-specific configurations
if (process.env.NODE_ENV !== 'production') {
 logger.add(new winston.transports.Console({
   format: winston.format.simple()
 }));
}