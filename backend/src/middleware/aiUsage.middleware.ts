import { Request, Response, NextFunction } from 'express';
import { AIUsage } from '../models/AIUsage';

// Free tier limits per feature per day
const FEATURE_LIMITS = {
  generate_content: 5,
  improve_content: 5,
  subject_lines: 5,
  smart_schedule: 5,
  generate_title: 5
} as const;

type FeatureType = keyof typeof FEATURE_LIMITS;

export const checkAIUsageLimit = (featureType: FeatureType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // The protect middleware sets req.user to the full User document
      const userId = req.user?._id;
      
      console.log('[AI Usage] Checking limit for:', {
        featureType,
        userId: userId?.toString(),
        hasUser: !!req.user,
        userKeys: req.user ? Object.keys(req.user) : []
      });
      
      if (!userId) {
        console.error('[AI Usage] No user ID found in request');
        res.status(401).json({
          status: 'error',
          message: 'Unauthorized'
        });
        return;
      }

      // Find or create usage record
      let usage = await AIUsage.findOne({ userId, featureType });
      
      if (!usage) {
        usage = await AIUsage.create({
          userId,
          featureType,
          count: 0,
          lastReset: new Date()
        });
      }

      // Check if we need to reset (24 hours passed)
      const hoursSinceReset = (Date.now() - usage.lastReset.getTime()) / (1000 * 60 * 60);
      if (hoursSinceReset >= 24) {
        usage.count = 0;
        usage.lastReset = new Date();
        await usage.save();
      }

      const limit = FEATURE_LIMITS[featureType];
      const remaining = limit - usage.count;

      if (usage.count >= limit) {
        const resetTime = new Date(usage.lastReset.getTime() + 24 * 60 * 60 * 1000);
        const hoursUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60 * 60));
        
        res.status(429).json({
          status: 'error',
          message: `AI usage limit reached. You've used all ${limit} ${getFeatureName(featureType)} requests for today.`,
          data: {
            limit,
            remaining: 0,
            resetIn: `${hoursUntilReset} hours`,
            resetTime: resetTime.toISOString()
          }
        });
        return;
      }

      // Increment usage
      usage.count += 1;
      await usage.save();

      console.log('[AI Usage] Usage incremented:', {
        featureType,
        count: usage.count,
        limit,
        remaining: remaining - 1
      });

      // Add usage info to response headers
      res.setHeader('X-AI-Limit', limit.toString());
      res.setHeader('X-AI-Remaining', (remaining - 1).toString());
      res.setHeader('X-AI-Reset', usage.lastReset.toISOString());

      next();
    } catch (error) {
      console.error('AI usage check error:', error);
      next(error);
    }
  };
};

// Get all usage stats for a user
export const getAIUsageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // The protect middleware sets req.user to the full User document
    const userId = req.user?._id;
    
    console.log('[AI Usage Stats] Fetching stats for user:', userId?.toString());
    
    if (!userId) {
      console.error('[AI Usage Stats] No user ID found in request');
      res.status(401).json({
        status: 'error',
        message: 'Unauthorized'
      });
      return;
    }

    const usageRecords = await AIUsage.find({ userId });
    
    const stats = Object.keys(FEATURE_LIMITS).map((feature) => {
      const featureType = feature as FeatureType;
      const record = usageRecords.find(r => r.featureType === featureType);
      const limit = FEATURE_LIMITS[featureType];
      const used = record?.count || 0;
      
      return {
        feature: getFeatureName(featureType),
        featureType,
        limit,
        used,
        remaining: limit - used,
        resetTime: record?.lastReset 
          ? new Date(record.lastReset.getTime() + 24 * 60 * 60 * 1000).toISOString()
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      };
    });

    res.json({
      status: 'success',
      data: {
        stats,
        totalUsed: stats.reduce((sum, s) => sum + s.used, 0),
        totalLimit: Object.values(FEATURE_LIMITS).reduce((sum, limit) => sum + limit, 0)
      }
    });
  } catch (error) {
    console.error('Get AI usage stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch usage statistics'
    });
  }
};

function getFeatureName(featureType: FeatureType): string {
  const names: Record<FeatureType, string> = {
    generate_content: 'Content Generation',
    improve_content: 'Content Improvement',
    subject_lines: 'Subject Line Generation',
    smart_schedule: 'Smart Scheduling',
    generate_title: 'Title Generation'
  };
  return names[featureType];
}
