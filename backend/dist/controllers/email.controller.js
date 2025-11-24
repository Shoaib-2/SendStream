"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailController = exports.EmailController = void 0;
const email_service_1 = require("../services/email.service");
const Newsletter_1 = __importDefault(require("../models/Newsletter"));
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const Subscriber_1 = __importDefault(require("../models/Subscriber"));
const Settings_1 = __importDefault(require("../models/Settings"));
/**
 * Controller class for handling email-related operations
 */
class EmailController {
    /**
     * Send newsletter to subscribers
     */
    async sendNewsletter(req, res, next) {
        try {
            const { newsletterId } = req.params;
            const newsletter = await Newsletter_1.default.findById(newsletterId);
            if (!newsletter) {
                throw new errors_1.APIError(404, "Newsletter not found");
            }
            const subscribers = await Subscriber_1.default.find({ status: "active" });
            const userSettingsPromises = subscribers.map((subscriber) => Settings_1.default.findOne({ userId: subscriber._id }));
            const userSettings = await Promise.all(userSettingsPromises);
            await email_service_1.emailService.sendNewsletter(newsletter, subscribers, userSettings.filter(Boolean));
            res.status(200).json({
                status: "success",
                message: `Newsletter sent to ${subscribers.length} subscribers`,
            });
        }
        catch (error) {
            logger_1.logger.error("Error in sendNewsletter:", error);
            next(error);
        }
    }
    /**
     * Get user's email usage for the current day
     */
    async getUsage(req, res, next) {
        try {
            if (!req.user?._id) {
                throw new errors_1.APIError(401, "Authentication required");
            }
            // Get today's date at midnight
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // Import the EmailUsage 
            const EmailUsageModel = require("../models/EmailUsage").default;
            // Find email usage for today or return default values
            const usage = await EmailUsageModel.findOne({
                userId: req.user._id,
                date: today,
            });
            // Default daily limit
            const dailyLimit = 100;
            if (usage) {
                res.status(200).json({
                    status: "success",
                    data: {
                        emailsSent: usage.emailsSent,
                        dailyLimit: dailyLimit,
                        remainingEmails: Math.max(0, dailyLimit - usage.emailsSent),
                        lastUpdated: usage.lastUpdated,
                    },
                });
            }
            else {
                // No emails sent today
                res.status(200).json({
                    status: "success",
                    data: {
                        emailsSent: 0,
                        dailyLimit: dailyLimit,
                        remainingEmails: dailyLimit,
                        lastUpdated: new Date(),
                    },
                });
            }
        }
        catch (error) {
            logger_1.logger.error("Error in getUsage:", error);
            next(error);
        }
    }
}
exports.EmailController = EmailController;
exports.emailController = new EmailController();
