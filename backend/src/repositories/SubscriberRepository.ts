import Subscriber from '../models/Subscriber';
import { Types } from 'mongoose';

/**
 * SubscriberRepository - Data access layer for Subscriber model
 * Abstracts all database operations for subscribers
 */
export class SubscriberRepository {
  /**
   * Create a new subscriber
   */
  async create(subscriberData: {
    email: string;
    name?: string;
    status?: 'active' | 'unsubscribed';
    createdBy: string | Types.ObjectId;
    source?: string;
  }) {
    return await Subscriber.create(subscriberData);
  }

  /**
   * Find subscriber by ID
   */
  async findById(subscriberId: string | Types.ObjectId) {
    return await Subscriber.findById(subscriberId).lean();
  }

  /**
   * Find all subscribers for a user
   */
  async findByUserId(userId: string | Types.ObjectId) {
    return await Subscriber.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Find subscribers by status
   */
  async findByStatus(
    userId: string | Types.ObjectId,
    status: 'active' | 'unsubscribed'
  ) {
    return await Subscriber.find({
      createdBy: userId,
      status
    }).sort({ createdAt: -1 }).lean();
  }

  /**
   * Find active subscribers for a user
   */
  async findActiveByUserId(userId: string | Types.ObjectId) {
    return await this.findByStatus(userId, 'active');
  }

  /**
   * Find subscriber by email
   */
  async findByEmail(email: string, userId?: string | Types.ObjectId) {
    const query: any = { email: email.toLowerCase() };
    if (userId) {
      query.createdBy = userId;
    }
    return await Subscriber.findOne(query).lean();
  }

  /**
   * Find subscriber by email and user (for unique constraint)
   */
  async findByEmailAndUser(email: string, userId: string | Types.ObjectId) {
    return await Subscriber.findOne({
      email: email.toLowerCase(),
      createdBy: userId
    }).lean();
  }

  /**
   * Find multiple subscribers by IDs
   */
  async findByIds(subscriberIds: (string | Types.ObjectId)[]) {
    return await Subscriber.find({
      _id: { $in: subscriberIds }
    });
  }

  /**
   * Update subscriber by ID
   */
  async update(
    subscriberId: string | Types.ObjectId,
    updateData: Record<string, any>
  ) {
    return await Subscriber.findByIdAndUpdate(
      subscriberId,
      updateData,
      { new: true, runValidators: true }
    );
  }

  /**
   * Update subscriber status
   */
  async updateStatus(
    subscriberId: string | Types.ObjectId,
    status: 'active' | 'unsubscribed'
  ) {
    const updateData: any = { status };
    if (status === 'unsubscribed') {
      updateData.unsubscribedAt = new Date();
    }
    
    return await Subscriber.findByIdAndUpdate(
      subscriberId,
      updateData,
      { new: true }
    );
  }

  /**
   * Bulk update subscriber statuses
   */
  async bulkUpdateStatus(
    subscriberIds: (string | Types.ObjectId)[],
    status: 'active' | 'unsubscribed'
  ) {
    const updateData: any = { status };
    if (status === 'unsubscribed') {
      updateData.unsubscribedAt = new Date();
    }

    return await Subscriber.updateMany(
      { _id: { $in: subscriberIds } },
      updateData
    );
  }

  /**
   * Bulk create subscribers
   */
  async bulkCreate(subscribers: Array<{
    email: string;
    name?: string;
    status?: 'active' | 'unsubscribed';
    createdBy: string | Types.ObjectId;
    source?: string;
  }>) {
    return await Subscriber.insertMany(subscribers, { ordered: false });
  }

  /**
   * Delete subscriber by ID
   */
  async delete(subscriberId: string | Types.ObjectId) {
    return await Subscriber.findByIdAndDelete(subscriberId);
  }

  /**
   * Bulk delete subscribers
   */
  async bulkDelete(subscriberIds: (string | Types.ObjectId)[]) {
    return await Subscriber.deleteMany({
      _id: { $in: subscriberIds }
    });
  }

  /**
   * Count subscribers by user
   */
  async countByUser(userId: string | Types.ObjectId): Promise<number> {
    return await Subscriber.countDocuments({ createdBy: userId });
  }

  /**
   * Count active subscribers
   */
  async countActive(userId: string | Types.ObjectId): Promise<number> {
    return await Subscriber.countDocuments({
      createdBy: userId,
      status: 'active'
    });
  }

  /**
   * Count unsubscribed subscribers
   */
  async countUnsubscribed(userId: string | Types.ObjectId): Promise<number> {
    return await Subscriber.countDocuments({
      createdBy: userId,
      status: 'unsubscribed'
    });
  }

  /**
   * Get subscriber statistics for a user
   */
  async getStatsByUser(userId: string | Types.ObjectId) {
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
  async emailExists(email: string, userId: string | Types.ObjectId): Promise<boolean> {
    const count = await Subscriber.countDocuments({
      email: email.toLowerCase(),
      createdBy: userId
    });
    return count > 0;
  }

  /**
   * Search subscribers by email or name
   */
  async search(userId: string | Types.ObjectId, searchTerm: string) {
    return await Subscriber.find({
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
  async findRecent(userId: string | Types.ObjectId, limit: number = 10) {
    return await Subscriber.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * Find subscribers by date range
   */
  async findByDateRange(
    userId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date
  ) {
    return await Subscriber.find({
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
  async findPaginated(
    userId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 10,
    status?: 'active' | 'unsubscribed'
  ) {
    const query: any = { createdBy: userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const [subscribers, total] = await Promise.all([
      Subscriber.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Subscriber.countDocuments(query)
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
  async getGrowthData(userId: string | Types.ObjectId, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const growth = await Subscriber.aggregate([
      {
        $match: {
          createdBy: new Types.ObjectId(userId as string),
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
  async findBySource(userId: string | Types.ObjectId, source: string) {
    return await Subscriber.find({
      createdBy: userId,
      source
    }).sort({ createdAt: -1 });
  }

  /**
   * Check if user owns subscriber
   */
  async isOwner(
    subscriberId: string | Types.ObjectId,
    userId: string | Types.ObjectId
  ): Promise<boolean> {
    const subscriber = await Subscriber.findById(subscriberId);
    return subscriber ? subscriber.createdBy.toString() === userId.toString() : false;
  }

  /**
   * Get aggregate subscriber statistics
   */
  async getAggregateStats(userId?: string | Types.ObjectId) {
    const matchStage: any = userId ? { createdBy: new Types.ObjectId(userId as string) } : {};
    
    const stats = await Subscriber.aggregate([
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

export const subscriberRepository = new SubscriberRepository();
