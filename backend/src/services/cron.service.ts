// services/cron.service.ts
import cron from 'node-cron';
import Newsletter from '../models/Newsletter';
import { emailService } from './email.service';
import Subscriber from '../models/Subscriber';
import { logger } from '../utils/logger';
import Settings from '../models/Settings';


const scheduledJobs = new Map();

export const cronService = {
  scheduleNewsletter: async (newsletterId: string, date: Date) => {
    // Format date to cron expression
    const cronExpression = `${date.getMinutes()} ${date.getHours()} ${date.getDate()} ${date.getMonth() + 1} *`;
    
    const job = cron.schedule(cronExpression, async () => {
      try {
        const newsletter = await Newsletter.findById(newsletterId);
        if (!newsletter) return;

        const subscribers = await Subscriber.find({ 
          status: 'active',
          createdBy: newsletter.createdBy 
        });
        const userSettings = await Settings.findOne({ userId: newsletter.createdBy });
        await emailService.sendNewsletter(newsletter, subscribers, userSettings);
        newsletter.status = 'sent';
        newsletter.sentDate = new Date();
        newsletter.sentTo = subscribers.length;
        await newsletter.save();
        
        // Remove job after completion
        job.stop();
        scheduledJobs.delete(newsletterId);
      } catch (error) {
        logger.error('Failed to send scheduled newsletter:', error);
      }
    });

    scheduledJobs.set(newsletterId, job);
  },

  cancelNewsletter: (newsletterId: string) => {
    const job = scheduledJobs.get(newsletterId);
    if (job) {
      job.stop();
      scheduledJobs.delete(newsletterId);
    }
  }
};