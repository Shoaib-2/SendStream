"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRepository = exports.AnalyticsRepository = void 0;
const analytics_1 = __importDefault(require("../models/analytics"));
const mongoose_1 = require("mongoose");
/**
 * AnalyticsRepository - Data access layer for Analytics model
 * Abstracts all database operations for newsletter analytics
 */
class AnalyticsRepository {
    /**
     * Create new analytics record for a newsletter
     */
    async create(analyticsData) {
        return await analytics_1.default.create(analyticsData);
    }
    /**
     * Find analytics by newsletter ID
     */
    async findByNewsletterId(newsletterId) {
        return await analytics_1.default.findOne({ newsletterId });
    }
    /**
     * Find analytics by newsletter ID with populations
     */
    async findByNewsletterIdWithDetails(newsletterId) {
        return await analytics_1.default.findOne({ newsletterId })
            .populate('opens.details.subscriberId', 'email name')
            .populate('clicks.details.subscriberId', 'email name')
            .populate('bounces.details.subscriberId', 'email name')
            .populate('unsubscribes.details.subscriberId', 'email name');
    }
    /**
     * Find all analytics for a user
     */
    async findByUserId(userId) {
        return await analytics_1.default.find({ createdBy: userId })
            .populate('newsletterId', 'title subject')
            .sort({ createdAt: -1 });
    }
    /**
     * Track email open event
     */
    async trackOpen(newsletterId, subscriberId) {
        return await analytics_1.default.findOneAndUpdate({ newsletterId }, {
            $inc: { 'opens.count': 1 },
            $push: {
                'opens.details': {
                    subscriberId,
                    timestamp: new Date()
                }
            }
        }, { new: true, upsert: true });
    }
    /**
     * Track click event
     */
    async trackClick(newsletterId, subscriberId, url) {
        return await analytics_1.default.findOneAndUpdate({ newsletterId }, {
            $inc: { 'clicks.count': 1 },
            $push: {
                'clicks.details': {
                    subscriberId,
                    url,
                    timestamp: new Date()
                }
            }
        }, { new: true, upsert: true });
    }
    /**
     * Track bounce event
     */
    async trackBounce(newsletterId, subscriberId, reason) {
        return await analytics_1.default.findOneAndUpdate({ newsletterId }, {
            $inc: { 'bounces.count': 1 },
            $push: {
                'bounces.details': {
                    subscriberId,
                    reason,
                    timestamp: new Date()
                }
            }
        }, { new: true, upsert: true });
    }
    /**
     * Track unsubscribe event
     */
    async trackUnsubscribe(newsletterId, subscriberId, reason) {
        return await analytics_1.default.findOneAndUpdate({ newsletterId }, {
            $inc: { 'unsubscribes.count': 1 },
            $push: {
                'unsubscribes.details': {
                    subscriberId,
                    reason: reason || 'Not specified',
                    timestamp: new Date()
                }
            }
        }, { new: true, upsert: true });
    }
    /**
     * Get summary statistics for a newsletter
     */
    async getStatsByNewsletterId(newsletterId) {
        const analytics = await analytics_1.default.findOne({ newsletterId });
        if (!analytics) {
            return {
                opens: { count: 0, details: [] },
                clicks: { count: 0, details: [] },
                bounces: { count: 0, details: [] },
                unsubscribes: { count: 0, details: [] }
            };
        }
        return {
            opens: analytics.opens || { count: 0, details: [] },
            clicks: analytics.clicks || { count: 0, details: [] },
            bounces: analytics.bounces || { count: 0, details: [] },
            unsubscribes: analytics.unsubscribes || { count: 0, details: [] }
        };
    }
    /**
     * Get aggregate analytics for all newsletters of a user
     */
    async getAggregateStatsByUser(userId) {
        const results = await analytics_1.default.aggregate([
            { $match: { createdBy: new mongoose_1.Types.ObjectId(userId) } },
            {
                $group: {
                    _id: null,
                    totalOpens: { $sum: '$opens.count' },
                    totalClicks: { $sum: '$clicks.count' },
                    totalBounces: { $sum: '$bounces.count' },
                    totalUnsubscribes: { $sum: '$unsubscribes.count' },
                    newsletterCount: { $sum: 1 }
                }
            }
        ]);
        return results[0] || {
            totalOpens: 0,
            totalClicks: 0,
            totalBounces: 0,
            totalUnsubscribes: 0,
            newsletterCount: 0
        };
    }
    /**
     * Get analytics by date range
     */
    async getStatsByDateRange(userId, startDate, endDate) {
        return await analytics_1.default.find({
            createdBy: userId,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).populate('newsletterId', 'title subject sentDate');
    }
    /**
     * Get top performing newsletters
     */
    async getTopPerforming(userId, limit = 5, metric = 'opens') {
        const sortField = metric === 'opens' ? 'opens.count' : 'clicks.count';
        return await analytics_1.default.find({ createdBy: userId })
            .populate('newsletterId', 'title subject sentDate')
            .sort({ [sortField]: -1 })
            .limit(limit);
    }
    /**
     * Delete analytics by newsletter ID
     */
    async deleteByNewsletterId(newsletterId) {
        return await analytics_1.default.findOneAndDelete({ newsletterId });
    }
    /**
     * Delete all analytics for a user
     */
    async deleteByUserId(userId) {
        return await analytics_1.default.deleteMany({ createdBy: userId });
    }
    /**
     * Get click-through rate for a newsletter
     */
    async getClickThroughRate(newsletterId) {
        const analytics = await analytics_1.default.findOne({ newsletterId });
        if (!analytics || !analytics.opens || analytics.opens.count === 0) {
            return 0;
        }
        const clickCount = analytics.clicks?.count || 0;
        const openCount = analytics.opens.count;
        return (clickCount / openCount) * 100;
    }
    /**
     * Get open rate for a newsletter (requires sentTo count from Newsletter)
     */
    async getOpenRate(newsletterId, sentTo) {
        const analytics = await analytics_1.default.findOne({ newsletterId });
        if (!analytics || !analytics.opens || sentTo === 0) {
            return 0;
        }
        return (analytics.opens.count / sentTo) * 100;
    }
    /**
     * Get engagement metrics for a newsletter
     */
    async getEngagementMetrics(newsletterId, sentTo) {
        const analytics = await analytics_1.default.findOne({ newsletterId });
        if (!analytics) {
            return {
                openRate: 0,
                clickRate: 0,
                bounceRate: 0,
                unsubscribeRate: 0,
                clickThroughRate: 0
            };
        }
        const opens = analytics.opens?.count || 0;
        const clicks = analytics.clicks?.count || 0;
        const bounces = analytics.bounces?.count || 0;
        const unsubscribes = analytics.unsubscribes?.count || 0;
        return {
            openRate: sentTo > 0 ? (opens / sentTo) * 100 : 0,
            clickRate: sentTo > 0 ? (clicks / sentTo) * 100 : 0,
            bounceRate: sentTo > 0 ? (bounces / sentTo) * 100 : 0,
            unsubscribeRate: sentTo > 0 ? (unsubscribes / sentTo) * 100 : 0,
            clickThroughRate: opens > 0 ? (clicks / opens) * 100 : 0
        };
    }
    /**
     * Get time-series data for opens and clicks
     */
    async getTimeSeriesData(userId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const analytics = await analytics_1.default.find({
            createdBy: userId,
            createdAt: { $gte: startDate }
        });
        // Process data into daily buckets
        const dailyData = {};
        analytics.forEach((record) => {
            // Process opens
            record.opens?.details.forEach((detail) => {
                const date = new Date(detail.timestamp).toISOString().split('T')[0];
                if (!dailyData[date]) {
                    dailyData[date] = { opens: 0, clicks: 0 };
                }
                dailyData[date].opens++;
            });
            // Process clicks
            record.clicks?.details.forEach((detail) => {
                const date = new Date(detail.timestamp).toISOString().split('T')[0];
                if (!dailyData[date]) {
                    dailyData[date] = { opens: 0, clicks: 0 };
                }
                dailyData[date].clicks++;
            });
        });
        return Object.keys(dailyData)
            .sort()
            .map((date) => ({
            date,
            opens: dailyData[date].opens,
            clicks: dailyData[date].clicks
        }));
    }
    /**
     * Count total analytics records
     */
    async count(userId) {
        const query = userId ? { createdBy: userId } : {};
        return await analytics_1.default.countDocuments(query);
    }
    /**
     * Check if analytics exist for newsletter
     */
    async exists(newsletterId) {
        const count = await analytics_1.default.countDocuments({ newsletterId });
        return count > 0;
    }
}
exports.AnalyticsRepository = AnalyticsRepository;
exports.analyticsRepository = new AnalyticsRepository();
