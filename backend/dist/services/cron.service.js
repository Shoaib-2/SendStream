"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cronService = void 0;
// services/cron.service.ts
const node_cron_1 = __importDefault(require("node-cron"));
const Newsletter_1 = __importDefault(require("../models/Newsletter"));
const email_service_1 = require("./email.service");
const Subscriber_1 = __importDefault(require("../models/Subscriber"));
const logger_1 = require("../utils/logger");
const Settings_1 = __importDefault(require("../models/Settings"));
const scheduledJobs = new Map();
exports.cronService = {
    scheduleNewsletter: async (newsletterId, date) => {
        // Format date to cron expression
        const cronExpression = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
        const job = node_cron_1.default.schedule(cronExpression, async () => {
            try {
                const newsletter = await Newsletter_1.default.findById(newsletterId);
                if (!newsletter)
                    return;
                const subscribers = await Subscriber_1.default.find({
                    status: 'active',
                    createdBy: newsletter.createdBy
                });
                const userSettings = await Settings_1.default.findOne({ userId: newsletter.createdBy });
                await email_service_1.emailService.sendNewsletter(newsletter, subscribers, userSettings);
                newsletter.status = 'sent';
                newsletter.sentDate = new Date();
                newsletter.sentTo = subscribers.length;
                await newsletter.save();
                // Remove job after completion
                job.stop();
                scheduledJobs.delete(newsletterId);
            }
            catch (error) {
                logger_1.logger.error('Failed to send scheduled newsletter:', error);
            }
        });
        scheduledJobs.set(newsletterId, job);
    },
    cancelNewsletter: (newsletterId) => {
        const job = scheduledJobs.get(newsletterId);
        if (job) {
            job.stop();
            scheduledJobs.delete(newsletterId);
        }
    }
};
