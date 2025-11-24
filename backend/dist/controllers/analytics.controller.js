"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsController = exports.AnalyticsController = void 0;
const analytics_1 = __importDefault(require("../models/analytics"));
const analytics_service_1 = require("../services/analytics.service");
const logger_1 = require("../utils/logger");
const Newsletter_1 = __importDefault(require("../models/Newsletter"));
const Subscriber_1 = __importDefault(require("../models/Subscriber"));
const cache_service_1 = require("../services/cache.service");
class AnalyticsController {
    /**
     * Get newsletter analytics
     */
    async getNewsletterAnalytics(req, res, next) {
        try {
            const { newsletterId } = req.params;
            const analytics = await analytics_1.default.findOne({ newsletterId });
            const newsletter = await Newsletter_1.default.findById(newsletterId);
            res.json({
                status: 'success',
                data: {
                    ...analytics?.toObject(),
                    contentQuality: newsletter?.contentQuality
                }
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting analytics:', error);
            next(error);
        }
    }
    async getGrowthData(req, res, next) {
        try {
            if (!req.user?._id)
                return next(new Error('Authentication required'));
            // Cache growth data for 30 minutes
            const cacheKey = cache_service_1.CacheKeys.analyticsGrowth(req.user._id, '6');
            const growthData = await cache_service_1.cacheService.getOrSet(cacheKey, async () => {
                // Get ALL subscribers, not just from the last 6 months
                const allSubscribers = await Subscriber_1.default.find({
                    createdBy: req.user?._id,
                }).sort('subscribed').lean();
                // Create a map to store monthly subscriber counts
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                // Create ordered array of the last 6 months with year info for accurate comparison
                const lastSixMonths = [];
                for (let i = 5; i >= 0; i--) {
                    const monthIndex = (currentMonth - i + 12) % 12;
                    const yearOffset = (currentMonth - i < 0) ? -1 : 0;
                    const year = currentYear + yearOffset;
                    lastSixMonths.push({
                        monthIndex,
                        monthName: months[monthIndex],
                        year
                    });
                }
                // Calculate cumulative subscriber count for each month
                return lastSixMonths.map((monthInfo) => {
                    // For each month, count subscribers who joined on or before this month
                    const count = allSubscribers.filter(sub => {
                        const subDate = new Date(sub.subscribed);
                        const subMonth = subDate.getMonth();
                        const subYear = subDate.getFullYear();
                        // Include if the subscription is from an earlier year
                        if (subYear < monthInfo.year)
                            return true;
                        // Or if it's the same year and earlier/same month
                        if (subYear === monthInfo.year && subMonth <= monthInfo.monthIndex)
                            return true;
                        return false;
                    }).length;
                    return {
                        month: monthInfo.monthName,
                        subscribers: count
                    };
                });
            }, 30 * 60 * 1000 // Cache for 30 minutes
            );
            res.json({
                status: 'success',
                data: growthData
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getRecentActivity(req, res, next) {
        try {
            const newsletters = await Newsletter_1.default.find({
                createdBy: req.user?._id,
                status: 'sent'
            })
                .sort('-sentDate')
                .limit(5)
                .lean();
            const activity = await Promise.all(newsletters.map(async (n) => {
                const recipientsCount = await Subscriber_1.default.countDocuments({ newsletterId: n._id });
                return {
                    title: n.title,
                    recipients: recipientsCount,
                    time: n.sentDate || new Date(),
                    contentQuality: n.contentQuality
                };
            }));
            res.json({
                status: 'success',
                data: activity
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Track pixel open
     */
    async trackPixel(req, res, next) {
        try {
            const { newsletterId, subscriberId } = req.params;
            await analytics_service_1.analyticsService.trackOpen(newsletterId, subscriberId);
            // Return a 1x1 transparent GIF
            res.writeHead(200, {
                'Content-Type': 'image/gif',
                'Content-Length': '43'
            });
            res.setHeader('Content-Type', 'image/gif');
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
        }
        catch (error) {
            logger_1.logger.error('Error tracking pixel:', error);
            next(error);
        }
    }
}
exports.AnalyticsController = AnalyticsController;
exports.analyticsController = new AnalyticsController();
