import Newsletter from '../models/Newsletter';
import { Types } from 'mongoose';

/**
 * NewsletterRepository - Data access layer for Newsletter model
 * Abstracts all database operations for newsletters
 */
export class NewsletterRepository {
  /**
   * Create a new newsletter
   */
  async create(newsletterData: {
    title: string;
    subject: string;
    content: string;
    status?: 'draft' | 'scheduled' | 'sent';
    scheduledDate?: Date;
    createdBy: string | Types.ObjectId;
    contentQuality?: any;
  }) {
    return await Newsletter.create(newsletterData);
  }

  /**
   * Find newsletter by ID
   */
  async findById(newsletterId: string | Types.ObjectId) {
    return await Newsletter.findById(newsletterId).lean();
  }

  /**
   * Find newsletter by ID and populate creator
   */
  async findByIdWithCreator(newsletterId: string | Types.ObjectId) {
    return await Newsletter.findById(newsletterId).populate('createdBy', 'email').lean();
  }

  /**
   * Find all newsletters by user ID
   */
  async findByUserId(userId: string | Types.ObjectId) {
    return await Newsletter.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Find newsletters by user ID with pagination
   */
  async findByUserIdPaginated(
    userId: string | Types.ObjectId,
    limit: number = 10,
    skip: number = 0
  ) {
    return await Newsletter.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();
  }

  /**
   * Find newsletters by status
   */
  async findByStatus(status: 'draft' | 'scheduled' | 'sent', userId?: string | Types.ObjectId) {
    const query: any = { status };
    if (userId) {
      query.createdBy = userId;
    }
    return await Newsletter.find(query).sort({ createdAt: -1 }).lean();
  }

  /**
   * Find scheduled newsletters that are ready to send
   */
  async findScheduledToSend() {
    return await Newsletter.find({
      status: 'scheduled',
      scheduledDate: { $lte: new Date() }
    });
  }

  /**
   * Find all scheduled newsletters
   */
  async findAllScheduled(userId?: string | Types.ObjectId) {
    const query: any = { status: 'scheduled' };
    if (userId) {
      query.createdBy = userId;
    }
    return await Newsletter.find(query).sort({ scheduledDate: 1 });
  }

  /**
   * Update newsletter by ID
   */
  async update(
    newsletterId: string | Types.ObjectId,
    updateData: Record<string, any>
  ) {
    return await Newsletter.findByIdAndUpdate(
      newsletterId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  /**
   * Update newsletter status
   */
  async updateStatus(
    newsletterId: string | Types.ObjectId,
    status: 'draft' | 'scheduled' | 'sent',
    additionalData?: Record<string, any>
  ) {
    const updateData: any = { status };
    if (additionalData) {
      Object.assign(updateData, additionalData);
    }
    return await Newsletter.findByIdAndUpdate(
      newsletterId,
      updateData,
      { new: true }
    );
  }

  /**
   * Mark newsletter as sent
   */
  async markAsSent(
    newsletterId: string | Types.ObjectId,
    sentTo: number
  ) {
    return await Newsletter.findByIdAndUpdate(
      newsletterId,
      {
        status: 'sent',
        sentDate: new Date(),
        sentTo
      },
      { new: true }
    );
  }

  /**
   * Delete newsletter by ID
   */
  async delete(newsletterId: string | Types.ObjectId) {
    return await Newsletter.findByIdAndDelete(newsletterId);
  }

  /**
   * Count newsletters by user
   */
  async countByUser(userId: string | Types.ObjectId): Promise<number> {
    return await Newsletter.countDocuments({ createdBy: userId });
  }

  /**
   * Count newsletters by status
   */
  async countByStatus(
    status: 'draft' | 'scheduled' | 'sent',
    userId?: string | Types.ObjectId
  ): Promise<number> {
    const query: any = { status };
    if (userId) {
      query.createdBy = userId;
    }
    return await Newsletter.countDocuments(query);
  }

  /**
   * Get newsletter statistics for a user
   */
  async getStatsByUser(userId: string | Types.ObjectId) {
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
  async findRecent(userId: string | Types.ObjectId, limit: number = 5) {
    return await Newsletter.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Find newsletters by date range
   */
  async findByDateRange(
    userId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date
  ) {
    return await Newsletter.find({
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
  async findSentInDateRange(
    userId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date
  ) {
    return await Newsletter.find({
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
  async getAggregateStats(userId?: string | Types.ObjectId) {
    const matchStage: any = userId ? { createdBy: new Types.ObjectId(userId as string) } : {};
    
    const stats = await Newsletter.aggregate([
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
  async search(
    userId: string | Types.ObjectId,
    searchTerm: string
  ) {
    return await Newsletter.find({
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
  async exists(newsletterId: string | Types.ObjectId): Promise<boolean> {
    const count = await Newsletter.countDocuments({ _id: newsletterId });
    return count > 0;
  }

  /**
   * Check if user owns newsletter
   */
  async isOwner(
    newsletterId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<boolean> {
    const newsletter = await Newsletter.findById(newsletterId);
    return newsletter ? newsletter.createdBy.toString() === userId.toString() : false;
  }
}

export const newsletterRepository = new NewsletterRepository();
