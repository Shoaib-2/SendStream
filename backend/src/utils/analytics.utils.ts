import Newsletter from '../models/Newsletter';
import Analytics from '../models/analytics';
import { logger } from './logger';

export async function calculateNewsletterStats(newsletter: any, userId?: string) {
  try {
    const analytics = await Analytics.findOne({
      newsletterId: newsletter._id,
      createdBy: userId || newsletter.createdBy
    });

    const opens = analytics?.opens?.count || 0;
    const sent = newsletter.sentTo || 0;
    const openRate = sent > 0 ? Math.round((opens / sent) * 1000) / 10 : 0;

    return {
      opens,
      sent,
      openRate
    };
  } catch (error) {
    logger.error('Error calculating newsletter stats:', error);
    return { opens: 0, sent: 0, openRate: 0 };
  }
}

export async function calculateOverallStats(newsletters: any[], userId?: string) {
  try {
    let totalOpens = 0;
    let totalSent = 0;

    for (const newsletter of newsletters) {
      const analytics = await Analytics.findOne({
        newsletterId: newsletter._id,
        createdBy: userId || newsletter.createdBy
      });
      
      if (analytics?.opens) {
        totalOpens += analytics.opens.count || 0;
      }
      totalSent += newsletter.sentTo || 0;
    }

    const openRate = totalSent ? Math.round((totalOpens / totalSent) * 1000) / 10 : 0;

    return {
      totalOpens,
      totalSent,
      openRate
    };
  } catch (error) {
    logger.error('Error calculating overall stats:', error);
    return { totalOpens: 0, totalSent: 0, openRate: 0 };
  }
} 