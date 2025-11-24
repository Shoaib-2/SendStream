"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardSummary = void 0;
const Newsletter_1 = __importDefault(require("../models/Newsletter"));
const Subscriber_1 = __importDefault(require("../models/Subscriber"));
/*
interface MonthlyData {
  [key: string]: number;
}
*/
const getDashboardSummary = async (req, res, next) => {
    try {
        const userId = req.user?._id;
        // Get current counts
        const [subscriberCount, newsletterCount] = await Promise.all([
            Subscriber_1.default.countDocuments({ createdBy: userId }),
            Newsletter_1.default.countDocuments({ createdBy: userId, status: "sent" })
        ]);
        // Calculate changes (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSubscribers = await Subscriber_1.default.countDocuments({
            createdBy: userId,
            subscribed: { $gte: thirtyDaysAgo },
        });
        const recentNewsletters = await Newsletter_1.default.countDocuments({
            createdBy: userId,
            status: "sent",
            sentDate: { $gte: thirtyDaysAgo },
        });
        const newsletters = await Newsletter_1.default.find({
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
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboardSummary = getDashboardSummary;
async function getSubscriberGrowth(userId) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const subscribers = await Subscriber_1.default.find({
        createdBy: userId,
        subscribed: { $gte: sixMonthsAgo },
    }).sort("subscribed");
    const monthlyData = {};
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
