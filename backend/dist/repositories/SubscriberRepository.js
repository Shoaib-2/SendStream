"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriberRepository = exports.SubscriberRepository = void 0;
const Subscriber_1 = __importDefault(require("../models/Subscriber"));
const mongoose_1 = require("mongoose");
/**
 * SubscriberRepository - Data access layer for Subscriber model
 * Abstracts all database operations for subscribers
 */
class SubscriberRepository {
    /**
     * Create a new subscriber
     */
    async create(subscriberData) {
        return await Subscriber_1.default.create(subscriberData);
    }
    /**
     * Find subscriber by ID
     */
    async findById(subscriberId) {
        return await Subscriber_1.default.findById(subscriberId).lean();
    }
    /**
     * Find all subscribers for a user
     */
    async findByUserId(userId) {
        return await Subscriber_1.default.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
    }
    /**
     * Find subscribers by status
     */
    async findByStatus(userId, status) {
        return await Subscriber_1.default.find({
            createdBy: userId,
            status
        }).sort({ createdAt: -1 }).lean();
    }
    /**
     * Find active subscribers for a user
     */
    async findActiveByUserId(userId) {
        return await this.findByStatus(userId, 'active');
    }
    /**
     * Find subscriber by email
     */
    async findByEmail(email, userId) {
        const query = { email: email.toLowerCase() };
        if (userId) {
            query.createdBy = userId;
        }
        return await Subscriber_1.default.findOne(query).lean();
    }
    /**
     * Find subscriber by email and user (for unique constraint)
     */
    async findByEmailAndUser(email, userId) {
        return await Subscriber_1.default.findOne({
            email: email.toLowerCase(),
            createdBy: userId
        }).lean();
    }
    /**
     * Find multiple subscribers by IDs
     */
    async findByIds(subscriberIds) {
        return await Subscriber_1.default.find({
            _id: { $in: subscriberIds }
        });
    }
    /**
     * Update subscriber by ID
     */
    async update(subscriberId, updateData) {
        return await Subscriber_1.default.findByIdAndUpdate(subscriberId, updateData, { new: true, runValidators: true });
    }
    /**
     * Update subscriber status
     */
    async updateStatus(subscriberId, status) {
        const updateData = { status };
        if (status === 'unsubscribed') {
            updateData.unsubscribedAt = new Date();
        }
        return await Subscriber_1.default.findByIdAndUpdate(subscriberId, updateData, { new: true });
    }
    /**
     * Bulk update subscriber statuses
     */
    async bulkUpdateStatus(subscriberIds, status) {
        const updateData = { status };
        if (status === 'unsubscribed') {
            updateData.unsubscribedAt = new Date();
        }
        return await Subscriber_1.default.updateMany({ _id: { $in: subscriberIds } }, updateData);
    }
    /**
     * Bulk create subscribers
     */
    async bulkCreate(subscribers) {
        return await Subscriber_1.default.insertMany(subscribers, { ordered: false });
    }
    /**
     * Delete subscriber by ID
     */
    async delete(subscriberId) {
        return await Subscriber_1.default.findByIdAndDelete(subscriberId);
    }
    /**
     * Bulk delete subscribers
     */
    async bulkDelete(subscriberIds) {
        return await Subscriber_1.default.deleteMany({
            _id: { $in: subscriberIds }
        });
    }
    /**
     * Count subscribers by user
     */
    async countByUser(userId) {
        return await Subscriber_1.default.countDocuments({ createdBy: userId });
    }
    /**
     * Count active subscribers
     */
    async countActive(userId) {
        return await Subscriber_1.default.countDocuments({
            createdBy: userId,
            status: 'active'
        });
    }
    /**
     * Count unsubscribed subscribers
     */
    async countUnsubscribed(userId) {
        return await Subscriber_1.default.countDocuments({
            createdBy: userId,
            status: 'unsubscribed'
        });
    }
    /**
     * Get subscriber statistics for a user
     */
    async getStatsByUser(userId) {
        const [total, active, unsubscribed] = await Promise.all([
            this.countByUser(userId),
            this.countActive(userId),
            this.countUnsubscribed(userId)
        ]);
        return {
            total,
            active,
            unsubscribed,
            unsubscribeRate: total > 0 ? (unsubscribed / total) * 100 : 0
        };
    }
    /**
     * Check if email exists for user
     */
    async emailExists(email, userId) {
        const count = await Subscriber_1.default.countDocuments({
            email: email.toLowerCase(),
            createdBy: userId
        });
        return count > 0;
    }
    /**
     * Search subscribers by email or name
     */
    async search(userId, searchTerm) {
        return await Subscriber_1.default.find({
            createdBy: userId,
            $or: [
                { email: { $regex: searchTerm, $options: 'i' } },
                { name: { $regex: searchTerm, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });
    }
    /**
     * Get recent subscribers
     */
    async findRecent(userId, limit = 10) {
        return await Subscriber_1.default.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .limit(limit);
    }
    /**
     * Find subscribers by date range
     */
    async findByDateRange(userId, startDate, endDate) {
        return await Subscriber_1.default.find({
            createdBy: userId,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ createdAt: -1 });
    }
    /**
     * Get subscribers with pagination
     */
    async findPaginated(userId, page = 1, limit = 10, status) {
        const query = { createdBy: userId };
        if (status) {
            query.status = status;
        }
        const skip = (page - 1) * limit;
        const [subscribers, total] = await Promise.all([
            Subscriber_1.default.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Subscriber_1.default.countDocuments(query)
        ]);
        return {
            subscribers,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
    /**
     * Get subscriber growth data (for analytics)
     */
    async getGrowthData(userId, days = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const growth = await Subscriber_1.default.aggregate([
            {
                $match: {
                    createdBy: new mongoose_1.Types.ObjectId(userId),
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    count: { $sum: 1 },
                    active: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                        }
                    },
                    unsubscribed: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'unsubscribed'] }, 1, 0]
                        }
                    }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        return growth;
    }
    /**
     * Find subscribers by source
     */
    async findBySource(userId, source) {
        return await Subscriber_1.default.find({
            createdBy: userId,
            source
        }).sort({ createdAt: -1 });
    }
    /**
     * Check if user owns subscriber
     */
    async isOwner(subscriberId, userId) {
        const subscriber = await Subscriber_1.default.findById(subscriberId);
        return subscriber ? subscriber.createdBy.toString() === userId.toString() : false;
    }
    /**
     * Get aggregate subscriber statistics
     */
    async getAggregateStats(userId) {
        const matchStage = userId ? { createdBy: new mongoose_1.Types.ObjectId(userId) } : {};
        const stats = await Subscriber_1.default.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'active'] }, 1, 0]
                        }
                    },
                    unsubscribed: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'unsubscribed'] }, 1, 0]
                        }
                    }
                }
            }
        ]);
        const result = stats[0] || { total: 0, active: 0, unsubscribed: 0 };
        return {
            ...result,
            unsubscribeRate: result.total > 0 ? (result.unsubscribed / result.total) * 100 : 0
        };
    }
}
exports.SubscriberRepository = SubscriberRepository;
exports.subscriberRepository = new SubscriberRepository();
