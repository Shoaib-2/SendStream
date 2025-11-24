// backend/src/utils/logger.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logDir = path.join(__dirname, '../../logs');

// Daily rotate file transport for errors
const errorRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxFiles: '14d', // Keep logs for 14 days
  maxSize: '20m', // Rotate when file reaches 20MB
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  )
});

// Daily rotate file transport for combined logs
const combinedRotateTransport = new DailyRotateFile({
  filename: path.join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxFiles: '14d', // Keep logs for 14 days
  maxSize: '20m', // Rotate when file reaches 20MB
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  )
});

// Create a custom format for logging
const customFormat = winston.format.printf(({ level, message, timestamp }) => {
 return `${timestamp} [${level}]: ${message}`;
});

// Create the logger
export const logger = winston.createLogger({
 level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
 format: winston.format.combine(
   winston.format.timestamp(),
   winston.format.colorize(),
   customFormat
 ),
 transports: [
   // Console transport for development
   new winston.transports.Console({
     format: winston.format.combine(
       winston.format.colorize(),
       winston.format.printf(({ timestamp, level, message, stack }) => {
         return stack
           ? `${timestamp} ${level}: ${message}\n${stack}`
           : `${timestamp} ${level}: ${message}`;
       })
     )
   }),
   
   // Daily rotating file transport for errors
   errorRotateTransport,
   
   // Daily rotating file transport for all logs
   combinedRotateTransport
 ]
});

// Add environment-specific configurations
if (process.env.NODE_ENV !== 'production') {
 logger.add(new winston.transports.Console({
   format: winston.format.simple()
 }));
}
