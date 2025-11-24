"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.AnalyticsService = void 0;
// backend/src/services/analytics.service.ts
const logger_1 = require("../utils/logger");
const analytics_1 = __importDefault(require("../models/analytics"));
const Newsletter_1 = __importDefault(require("../models/Newsletter"));
const errors_1 = require("../utils/errors");
class AnalyticsService {
    /**
     * Track email open
     */
    async trackOpen(newsletterId, subscriberId) {
        try {
            logger_1.logger.info('Tracking open for newsletter', { newsletterId, subscriberId });
            // Get the newsletter to get the createdBy field
            const newsletter = await Newsletter_1.default.findById(newsletterId);
            if (!newsletter) {
                throw new Error('Newsletter not found');
            }
            let analytics = await analytics_1.default.findOne({ newsletterId });
            if (!analytics) {
                analytics = await analytics_1.default.create({
                    newsletterId,
                    createdBy: newsletter.createdBy, // Set the createdBy field
                    opens: { count: 0, details: [] },
                    clicks: { count: 0, details: [] },
                    bounces: { count: 0, details: [] }
                });
            }
            // Update opens count and add details
            await analytics_1.default.findByIdAndUpdate(analytics._id, {
                $inc: { 'opens.count': 1 },
                $push: {
                    'opens.details': {
                        subscriberId,
                        timestamp: new Date()
                    }
                }
            });
            logger_1.logger.info('Successfully recorded open event', { newsletterId, subscriberId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error tracking open:', error);
            throw new errors_1.APIError(500, 'Failed to track email open');
        }
    }
    /**
     * Get analytics for a newsletter
     */
    async getNewsletterAnalytics(newsletterId) {
        try {
            const analytics = await analytics_1.default.findOne({ newsletterId });
            return analytics;
        }
        catch (error) {
            logger_1.logger.error('Error getting analytics:', error);
            throw new errors_1.APIError(500, 'Failed to get newsletter analytics');
        }
    }
    async trackUnsubscribe(newsletterId, subscriberId) {
        try {
            const newsletter = await Newsletter_1.default.findById(newsletterId);
            if (!newsletter) {
                throw new Error('Newsletter not found');
            }
            let analytics = await analytics_1.default.findOne({ newsletterId });
            if (!analytics) {
                analytics = await analytics_1.default.create({
                    newsletterId,
                    createdBy: newsletter.createdBy,
                    opens: { count: 0, details: [] },
                    clicks: { count: 0, details: [] },
                    bounces: { count: 0, details: [] },
                    unsubscribes: { count: 0, details: [] }
                });
            }
            await analytics_1.default.findByIdAndUpdate(analytics._id, {
                $inc: { 'unsubscribes.count': 1 },
                $push: {
                    'unsubscribes.details': {
                        subscriberId,
                        timestamp: new Date()
                    }
                }
            });
            logger_1.logger.info('Tracked unsubscribe event', { newsletterId, subscriberId });
        }
        catch (error) {
            logger_1.logger.error('Error tracking unsubscribe:', error);
            throw new errors_1.APIError(500, 'Failed to track unsubscribe');
        }
    }
}
exports.AnalyticsService = AnalyticsService;
exports.analyticsService = new AnalyticsService();
