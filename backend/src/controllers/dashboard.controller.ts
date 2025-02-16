import { Request, Response, NextFunction } from "express";
import Newsletter from "../models/Newsletter";
import Subscriber from "../models/Subscriber";
import Analytics from "../models/analytics";
import { logger } from "../utils/logger";
import { calculateOverallStats } from "../utils/analytics.utils";

interface MonthlyData {
  [key: string]: number;
}

export const getDashboardSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    // Get current counts
    const [subscriberCount, newsletterCount] = await Promise.all([
      Subscriber.countDocuments({ createdBy: userId }),
      Newsletter.countDocuments({ createdBy: userId, status: "sent" })
    ]);

    // Calculate changes (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSubscribers = await Subscriber.countDocuments({
      createdBy: userId,
      subscribed: { $gte: thirtyDaysAgo },
    });

    const recentNewsletters = await Newsletter.countDocuments({
      createdBy: userId,
      status: "sent",
      sentDate: { $gte: thirtyDaysAgo },
    });

    // Calculate open rate
    const newsletters = await Newsletter.find({
      createdBy: userId,
      status: "sent",
    });

    const { openRate } = await calculateOverallStats(newsletters);

    const openRateChange = await calculateOpenRateChange(userId, thirtyDaysAgo);

    const growthData = await getSubscriberGrowth(userId) || [];
    const recentActivity = newsletters
      .map((n) => {
        if (n.sentDate) {
          return {
            title: n.title,
            recipients: n.sentTo || 0,
            time: new Date(n.sentDate).toISOString(),
          };
        }
        return null;
      })
      .filter((n) => n !== null)
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 5);
    const responseData = {
      status: "success",
      data: {
        subscribers: {
          total: subscriberCount,
          change: subscriberCount ? (recentSubscribers / subscriberCount) * 100 : 0,
        },
        newsletters: {
          total: newsletterCount,
          change: newsletterCount ? (recentNewsletters / newsletterCount) * 100 : 0,
        },
        openRate: {
          value: openRate,
          change: openRateChange,
        },
        growthData,
        recentActivity,
      },
    };
    res.json(responseData);
  } catch (error) {
    next(error);
  }
};

async function calculateOpenRateChange(userId: string, thirtyDaysAgo: Date) {
  try {
    const currentOpens = await getCurrentOpens(userId, thirtyDaysAgo);
    const currentSent = await getCurrentSent(userId, thirtyDaysAgo);
    const currentOpenRate = currentSent > 0 ? (currentOpens / currentSent) * 100 : 0;
    
    // Find newsletters sent before the cutoff date
    const oldNewsletters = await Newsletter.find({
      createdBy: userId,
      status: "sent",
      sentDate: { $lt: thirtyDaysAgo }
    });

    let oldOpens = 0;
    let oldSent = 0;

    for (const newsletter of oldNewsletters) {
      const analytics = await Analytics.findOne({ 
        newsletterId: newsletter._id 
      });
      
      if (analytics) {
        oldOpens += analytics.opens.count || 0;
      }
      oldSent += newsletter.sentTo || 0;
    }

    const oldOpenRate = oldSent > 0 ? (oldOpens / oldSent) * 100 : 0;
    
    // If there are current sends but no previous data, return 0 to indicate no change
    if (currentSent > 0 && oldSent === 0) {
      return 0;
    }
    
    // Calculate change, defaulting to 0 if no previous data
    const openRateChange = oldOpenRate > 0 
      ? ((currentOpenRate - oldOpenRate) / oldOpenRate) * 100 
      : 0;

    logger.info('Open rate change result', { 
      oldOpenRate, 
      currentOpenRate, 
      openRateChange,
      oldOpens,
      oldSent,
      currentOpens,
      currentSent
    });

    return openRateChange;

  } catch (error) {
    console.error('Open Rate Calculation Error:', error);
    return 0; // Return 0 instead of null on error
  }
}

async function getCurrentOpens(userId: string, thirtyDaysAgo: Date) {
  try {
    // Find recent newsletters
    const recentNewsletters = await Newsletter.find({
      createdBy: userId,
      status: "sent",
      sentDate: { $gte: thirtyDaysAgo }
    });

    let recentOpens = 0;

    // Calculate opens for recent newsletters
    for (const newsletter of recentNewsletters) {
      const analytics = await Analytics.findOne({ 
        newsletterId: newsletter._id 
      });

      if (analytics && analytics.opens) {
        recentOpens += analytics.opens.count || 0;
        logger.info('Found opens for newsletter', {
          newsletterId: newsletter._id,
          opens: analytics.opens.count,
          totalSoFar: recentOpens
        });
      }
    }

    logger.info('Current opens calculation:', {
      recentOpens,
      newsletterCount: recentNewsletters.length,
      timeframe: thirtyDaysAgo
    });

    return recentOpens;

  } catch (error) {
    console.error('Current Opens Calculation Error:', error);
    return 0;
  }
}

async function getCurrentSent(userId: string, thirtyDaysAgo: Date) {
  try {
    // Find recent newsletters
    const recentNewsletters = await Newsletter.find({
      createdBy: userId,
      status: "sent",
      sentDate: { $gte: thirtyDaysAgo }
    });


    let recentSent = 0;

    // Calculate sent count for recent newsletters
    for (const newsletter of recentNewsletters) {
      recentSent += newsletter.sentTo || 0;
    }
    // Calculate sent rate
    const currentSent = recentSent 
      ? recentSent 
      : 0;

    console.log('Current Sent:', currentSent);

    return currentSent;

  } catch (error) {
    console.error('Current Sent Calculation Error:', error);
    return 0;
  }
}

async function getSubscriberGrowth(userId: string) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const subscribers = await Subscriber.find({
    createdBy: userId,
    subscribed: { $gte: sixMonthsAgo },
  }).sort("subscribed");

  const monthlyData: { [key: string]: number } = {};

  subscribers.forEach((sub) => {
    if (sub.subscribed) {
      const subDate = new Date(sub.subscribed);
      const month = subDate.toLocaleString("default", { month: "short" });
      monthlyData[month] = (monthlyData[month] || 0) + 1;
    }
  });

  return Object.entries(monthlyData).map(([month, count]) => ({
    month,
    subscribers: count,
  }));
}
