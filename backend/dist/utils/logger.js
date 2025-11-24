"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
// backend/src/utils/logger.ts
const winston_1 = __importDefault(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const path_1 = __importDefault(require("path"));
const logDir = path_1.default.join(__dirname, '../../logs');
// Daily rotate file transport for errors
const errorRotateTransport = new winston_daily_rotate_file_1.default({
    filename: path_1.default.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxFiles: '14d', // Keep logs for 14 days
    maxSize: '20m', // Rotate when file reaches 20MB
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json())
});
// Daily rotate file transport for combined logs
const combinedRotateTransport = new winston_daily_rotate_file_1.default({
    filename: path_1.default.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '14d', // Keep logs for 14 days
    maxSize: '20m', // Rotate when file reaches 20MB
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston_1.default.format.json())
});
// Create a custom format for logging
const customFormat = winston_1.default.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
});
// Create the logger
exports.logger = winston_1.default.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.colorize(), customFormat),
    transports: [
        // Console transport for development
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.printf(({ timestamp, level, message, stack }) => {
                return stack
                    ? `${timestamp} ${level}: ${message}\n${stack}`
                    : `${timestamp} ${level}: ${message}`;
            }))
        }),
        // Daily rotating file transport for errors
        errorRotateTransport,
        // Daily rotating file transport for all logs
        combinedRotateTransport
    ]
});
// Add environment-specific configurations
if (process.env.NODE_ENV !== 'production') {
    exports.logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.simple()
    }));
}
