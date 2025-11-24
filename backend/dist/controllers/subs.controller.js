"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSubscriber = exports.unsubscribeSubscriber = exports.exportSubscribers = exports.importSubscribers = exports.bulkDeleteSubscribers = exports.deleteSubscriber = exports.createSubscriber = exports.getSubscribers = void 0;
const subscriber_service_1 = require("../services/subscriber.service");
const server_1 = require("../server");
const logger_1 = require("../utils/logger");
const cache_service_1 = require("../services/cache.service");
const getSubscribers = async (req, res, next) => {
    try {
        if (!req.user?._id) {
            return next(new Error('Authentication required'));
        }
        // Use cache for subscriber list
        const cacheKey = cache_service_1.CacheKeys.subscriberCount(req.user._id);
        const subscribers = await cache_service_1.cacheService.getOrSet(cacheKey, async () => await subscriber_service_1.subscriberService.getAllSubscribers(req.user._id), 60 * 1000 // Cache for 1 minute
        );
        res.json({ status: 'success', data: subscribers });
    }
    catch (error) {
        logger_1.logger.error('Error fetching subscribers:', error);
        next(error);
    }
};
exports.getSubscribers = getSubscribers;
const createSubscriber = async (req, res, next) => {
    try {
        if (!req.user?._id) {
            return next(new Error('Authentication required'));
        }
        const { email, name } = req.body;
        const subscriber = await subscriber_service_1.subscriberService.createSubscriber(email, name, req.user._id);
        // Invalidate subscriber cache
        cache_service_1.cacheService.deletePattern(`subscribers:${req.user._id}:.*`);
        res.status(201).json({
            status: 'success',
            data: subscriber
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating subscriber:', error);
        return next(error);
    }
};
exports.createSubscriber = createSubscriber;
const deleteSubscriber = async (req, res, next) => {
    try {
        if (!req.user?._id) {
            return next(new Error('Authentication required'));
        }
        const subscriber = await subscriber_service_1.subscriberService.updateSubscriberStatus(req.params.id, 'unsubscribed', req.user._id);
        // Invalidate subscriber cache
        cache_service_1.cacheService.deletePattern(`subscribers:${req.user._id}:.*`);
        (0, server_1.broadcastSubscriberUpdate)(req.params.id, 'unsubscribed');
        res.status(200).json({
            status: 'success',
            data: subscriber
        });
    }
    catch (error) {
        logger_1.logger.error('Delete subscriber error:', error);
        return next(error);
    }
};
exports.deleteSubscriber = deleteSubscriber;
const bulkDeleteSubscribers = async (req, res, next) => {
    try {
        if (!req.user?._id) {
            return next(new Error('Authentication required'));
        }
        const { ids } = req.body;
        const modifiedCount = await subscriber_service_1.subscriberService.bulkUnsubscribe(ids, req.user._id);
        if (modifiedCount === 0) {
            return res.status(200).json({
                status: 'success',
                message: 'No subscribers found to delete'
            });
        }
        // Invalidate subscriber cache
        cache_service_1.cacheService.deletePattern(`subscribers:${req.user._id}:.*`);
        // Broadcast updates
        for (const id of ids) {
            (0, server_1.broadcastSubscriberUpdate)(id, 'unsubscribed');
        }
        res.status(200).json({
            status: 'success',
            message: `${modifiedCount} subscribers marked as unsubscribed`
        });
    }
    catch (error) {
        logger_1.logger.error('Bulk delete subscribers error:', error);
        return next(error);
    }
};
exports.bulkDeleteSubscribers = bulkDeleteSubscribers;
const importSubscribers = async (req, res, next) => {
    try {
        if (!req.user?._id) {
            return next(new Error('Authentication required'));
        }
        const { csvData } = req.body;
        const result = await subscriber_service_1.subscriberService.importSubscribers(csvData, req.user._id);
        // Invalidate subscriber cache after import
        cache_service_1.cacheService.deletePattern(`subscribers:${req.user._id}:.*`);
        return res.status(201).json({
            status: 'success',
            imported: result.imported,
            data: result.subscribers
        });
    }
    catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 11000) {
            return res.status(500).json({
                status: 'error',
                message: 'duplicate key error'
            });
        }
        return next(error);
    }
};
exports.importSubscribers = importSubscribers;
const exportSubscribers = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new Error('Authentication required'));
        }
        const csvContent = await subscriber_service_1.subscriberService.exportSubscribers(req.user._id);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
        res.send(csvContent);
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to export subscribers'
        });
    }
};
exports.exportSubscribers = exportSubscribers;
const unsubscribeSubscriber = async (req, res, next) => {
    try {
        const token = req.params.token;
        const result = await subscriber_service_1.subscriberService.unsubscribeByToken(token);
        if (!result.success) {
            return res.redirect(`${process.env.CLIENT_URL}/unsubscribe-error`);
        }
        if (result.subscriber) {
            (0, server_1.broadcastSubscriberUpdate)(result.subscriber._id.toString(), 'unsubscribed');
        }
        res.redirect(`${process.env.CLIENT_URL}/unsubscribe-success`);
    }
    catch (error) {
        return next(error);
    }
};
exports.unsubscribeSubscriber = unsubscribeSubscriber;
const updateSubscriber = async (req, res, next) => {
    try {
        if (!req.user?._id) {
            return next(new Error('Authentication required'));
        }
        const { id } = req.params;
        const { status } = req.body;
        const subscriber = await subscriber_service_1.subscriberService.updateSubscriberStatus(id, status, req.user._id);
        // Invalidate subscriber cache
        cache_service_1.cacheService.deletePattern(`subscribers:${req.user._id}:.*`);
        (0, server_1.broadcastSubscriberUpdate)(id, status);
        return res.json({
            status: 'success',
            data: subscriber
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating subscriber:', error);
        return next(error);
    }
};
exports.updateSubscriber = updateSubscriber;
