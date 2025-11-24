"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectionStatus = exports.connectDB = void 0;
// backend/src/config/database.ts
const mongoose_1 = __importDefault(require("mongoose"));
const logger_1 = require("../utils/logger");
const database_indexes_1 = require("./database-indexes");
// Connection ready state
let isConnected = false;
const connectDB = async () => {
    try {
        if (isConnected) {
            logger_1.logger.info('Using existing database connection');
            return;
        }
        // Configure connection pooling for production
        const options = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 2, // Minimum number of connections
            maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        };
        const conn = await mongoose_1.default.connect(process.env.MONGODB_URI, options);
        isConnected = true;
        logger_1.logger.info(`MongoDB Connected: ${conn.connection.host}`);
        // Handle connection errors
        mongoose_1.default.connection.on('error', (err) => {
            logger_1.logger.error('MongoDB connection error:', err);
            isConnected = false;
        });
        mongoose_1.default.connection.on('disconnected', () => {
            logger_1.logger.warn('MongoDB disconnected');
            isConnected = false;
        });
        // Graceful shutdown
        process.on('SIGINT', async () => {
            try {
                await mongoose_1.default.connection.close();
                logger_1.logger.info('MongoDB connection closed through app termination');
                process.exit(0);
            }
            catch (err) {
                logger_1.logger.error('Error closing MongoDB connection:', err);
                process.exit(1);
            }
        });
        // Enable query performance monitoring in development
        if (process.env.NODE_ENV === 'development') {
            mongoose_1.default.set('debug', (collectionName, method, query, doc) => {
                logger_1.logger.debug(`Mongoose: ${collectionName}.${method}`, { query, doc });
            });
        }
        // Create comprehensive database indexes
        await (0, database_indexes_1.createDatabaseIndexes)();
    }
    catch (error) {
        logger_1.logger.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
// Export connection status for health checks
const getConnectionStatus = () => ({
    isConnected,
    readyState: mongoose_1.default.connection.readyState,
    host: mongoose_1.default.connection.host,
    name: mongoose_1.default.connection.name
});
exports.getConnectionStatus = getConnectionStatus;
