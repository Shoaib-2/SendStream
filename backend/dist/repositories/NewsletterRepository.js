"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsletterRepository = exports.NewsletterRepository = void 0;
const Newsletter_1 = __importDefault(require("../models/Newsletter"));
const mongoose_1 = require("mongoose");
/**
 * NewsletterRepository - Data access layer for Newsletter model
 * Abstracts all database operations for newsletters
 */
class NewsletterRepository {
    /**
     * Create a new newsletter
     */
    async create(newsletterData) {
        return await Newsletter_1.default.create(newsletterData);
    }
    /**
     * Find newsletter by ID
     */
    async findById(newsletterId) {
        return await Newsletter_1.default.findById(newsletterId).lean();
    }
    /**
     * Find newsletter by ID and populate creator
     */
    async findByIdWithCreator(newsletterId) {
        return await Newsletter_1.default.findById(newsletterId).populate('createdBy', 'email').lean();
    }
    /**
     * Find all newsletters by user ID
     */
    async findByUserId(userId) {
        return await Newsletter_1.default.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .lean();
    }
    /**
     * Find newsletters by user ID with pagination
     */
    async findByUserIdPaginated(userId, limit = 10, skip = 0) {
        return await Newsletter_1.default.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .lean();
    }
    /**
     * Find newsletters by status
     */
    async findByStatus(status, userId) {
        const query = { status };
        if (userId) {
            query.createdBy = userId;
        }
        return await Newsletter_1.default.find(query).sort({ createdAt: -1 }).lean();
    }
    /**
     * Find scheduled newsletters that are ready to send
     */
    async findScheduledToSend() {
        return await Newsletter_1.default.find({
            status: 'scheduled',
            scheduledDate: { $lte: new Date() }
        });
    }
    /**
     * Find all scheduled newsletters
     */
    async findAllScheduled(userId) {
        const query = { status: 'scheduled' };
        if (userId) {
            query.createdBy = userId;
        }
        return await Newsletter_1.default.find(query).sort({ scheduledDate: 1 });
    }
    /**
     * Update newsletter by ID
     */
    async update(newsletterId, updateData) {
        return await Newsletter_1.default.findByIdAndUpdate(newsletterId, updateData, { new: true, runValidators: true });
    }
    /**
     * Update newsletter status
     */
    async updateStatus(newsletterId, status, additionalData) {
        const updateData = { status };
        if (additionalData) {
            Object.assign(updateData, additionalData);
        }
        return await Newsletter_1.default.findByIdAndUpdate(newsletterId, updateData, { new: true });
    }
    /**
     * Mark newsletter as sent
     */
    async markAsSent(newsletterId, sentTo) {
        return await Newsletter_1.default.findByIdAndUpdate(newsletterId, {
            status: 'sent',
            sentDate: new Date(),
            sentTo
        }, { new: true });
    }
    /**
     * Delete newsletter by ID
     */
    async delete(newsletterId) {
        return await Newsletter_1.default.findByIdAndDelete(newsletterId);
    }
    /**
     * Count newsletters by user
     */
    async countByUser(userId) {
        return await Newsletter_1.default.countDocuments({ createdBy: userId });
    }
    /**
     * Count newsletters by status
     */
    async countByStatus(status, userId) {
        const query = { status };
        if (userId) {
            query.createdBy = userId;
        }
        return await Newsletter_1.default.countDocuments(query);
    }
    /**
     * Get newsletter statistics for a user
     */
    async getStatsByUser(userId) {
        const [total, drafts, scheduled, sent] = await Promise.all([
            this.countByUser(userId),
            this.countByStatus('draft', userId),
            this.countByStatus('scheduled', userId),
            this.countByStatus('sent', userId)
        ]);
        return {
            total,
            drafts,
            scheduled,
            sent
        };
    }
    /**
     * Get recent newsletters
     */
    async findRecent(userId, limit = 5) {
        return await Newsletter_1.default.find({ createdBy: userId })
            .sort({ createdAt: -1 })
            .limit(limit);
    }
    /**
     * Find newsletters by date range
     */
    async findByDateRange(userId, startDate, endDate) {
        return await Newsletter_1.default.find({
            createdBy: userId,
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ createdAt: -1 });
    }
    /**
     * Find newsletters sent in date range
     */
    async findSentInDateRange(userId, startDate, endDate) {
        return await Newsletter_1.default.find({
            createdBy: userId,
            status: 'sent',
            sentDate: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ sentDate: -1 });
    }
    /**
     * Get aggregate stats for all newsletters
     */
    async getAggregateStats(userId) {
        const matchStage = userId ? { createdBy: new mongoose_1.Types.ObjectId(userId) } : {};
        const stats = await Newsletter_1.default.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalNewsletters: { $sum: 1 },
                    totalSent: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'sent'] }, 1, 0]
                        }
                    },
                    totalScheduled: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0]
                        }
                    },
                    totalDrafts: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'draft'] }, 1, 0]
                        }
                    },
                    totalRecipients: { $sum: '$sentTo' },
                    avgQualityScore: { $avg: '$contentQuality.qualityScore' }
                }
            }
        ]);
        return stats[0] || {
            totalNewsletters: 0,
            totalSent: 0,
            totalScheduled: 0,
            totalDrafts: 0,
            totalRecipients: 0,
            avgQualityScore: 0
        };
    }
    /**
     * Search newsletters by title or subject
     */
    async search(userId, searchTerm) {
        return await Newsletter_1.default.find({
            createdBy: userId,
            $or: [
                { title: { $regex: searchTerm, $options: 'i' } },
                { subject: { $regex: searchTerm, $options: 'i' } }
            ]
        }).sort({ createdAt: -1 });
    }
    /**
     * Check if newsletter exists
     */
    async exists(newsletterId) {
        const count = await Newsletter_1.default.countDocuments({ _id: newsletterId });
        return count > 0;
    }
    /**
     * Check if user owns newsletter
     */
    async isOwner(newsletterId, userId) {
        const newsletter = await Newsletter_1.default.findById(newsletterId);
        return newsletter ? newsletter.createdBy.toString() === userId.toString() : false;
    }
}
exports.NewsletterRepository = NewsletterRepository;
exports.newsletterRepository = new NewsletterRepository();
