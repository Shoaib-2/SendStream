import { Request, Response, NextFunction } from "express";
import Newsletter from "../models/Newsletter";
import Subscriber from "../models/Subscriber";

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

    const newsletters = await Newsletter.find({
      createdBy: userId,
      status: "sent",
    });

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
        data: {
          subscribers: {
            total: subscriberCount,
            change: subscriberCount ? (recentSubscribers / subscriberCount) * 100 : 0,
          },
          newsletters: {
            total: newsletterCount,
            change: newsletterCount ? (recentNewsletters / newsletterCount) * 100 : 0,
          },
          growthData,
          recentActivity,
        }
      }
    };
    req.app.locals.lastSummaryData = responseData;
    res.json(responseData);
  } catch (error) {
    next(error);
  }
};

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