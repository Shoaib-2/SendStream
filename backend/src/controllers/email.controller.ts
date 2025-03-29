// backend/src/controllers/email.controller.ts
import { Request, Response, NextFunction } from "express";
import { emailService } from "../services/email.service";
import Newsletter from "../models/Newsletter";
import { APIError } from "../utils/errors";
import { logger } from "../utils/logger";
import Subscriber from "../models/Subscriber";
import Settings from "../models/Settings";

/**
 * Controller class for handling email-related operations
 */
export class EmailController {
  /**
   * Send newsletter to subscribers
   */
  async sendNewsletter(req: Request, res: Response, next: NextFunction) {
    try {
      const { newsletterId } = req.params;
      const newsletter = await Newsletter.findById(newsletterId);

      if (!newsletter) {
        throw new APIError(404, "Newsletter not found");
      }

      const subscribers = await Subscriber.find({ status: "active" });
      const userSettingsPromises = subscribers.map((subscriber) =>
        Settings.findOne({ userId: subscriber._id })
      );
      const userSettings = await Promise.all(userSettingsPromises);
      await emailService.sendNewsletter(
        newsletter,
        subscribers,
        userSettings.filter(Boolean)
      );

      res.status(200).json({
        status: "success",
        message: `Newsletter sent to ${subscribers.length} subscribers`,
      });
    } catch (error) {
      logger.error("Error in sendNewsletter:", error);
      next(error);
    }
  }

  /**
   * Get user's email usage for the current day
   */
  async getUsage(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user?._id) {
        throw new APIError(401, "Authentication required");
      }

      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Import the EmailUsage model properly
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
      } else {
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
    } catch (error) {
      logger.error("Error in getUsage:", error);
      next(error);
    }
  }
}

export const emailController = new EmailController();
