"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriberService = exports.SubscriberService = void 0;
const Subscriber_1 = __importDefault(require("../models/Subscriber"));
const Settings_1 = __importDefault(require("../models/Settings"));
const customErrors_1 = require("../utils/customErrors");
const logger_1 = require("../utils/logger");
const mailchimp_1 = require("./Integrations/mailchimp");
const papaparse_1 = __importDefault(require("papaparse"));
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * Helper to get decrypted Mailchimp API key from settings
 */
function getDecryptedMailchimpKey(settings) {
    if (!settings.mailchimp?.apiKey) {
        throw new Error('Mailchimp API key not found');
    }
    return settings.getDecryptedMailchimpApiKey() || settings.mailchimp.apiKey;
}
class SubscriberService {
    /**
     * Sync Mailchimp subscribers with local database
     */
    async syncMailchimpSubscribers(userId) {
        const settings = await Settings_1.default.findOne({ userId });
        if (!settings?.mailchimp?.enabled) {
            return [];
        }
        const decryptedApiKey = getDecryptedMailchimpKey(settings);
        const mailchimpService = new mailchimp_1.MailchimpService(decryptedApiKey, settings.mailchimp.serverPrefix.trim());
        await mailchimpService.initializeList();
        const mailchimpSubscribers = await mailchimpService.syncSubscribers();
        const localSubscribers = await Subscriber_1.default.find({ createdBy: userId });
        const localSubscribersByEmail = new Map();
        localSubscribers.forEach(sub => {
            localSubscribersByEmail.set(sub.email.toLowerCase(), {
                id: sub._id.toString(),
                status: sub.status
            });
        });
        const mailchimpUpdates = [];
        const operations = [];
        for (const mcSub of mailchimpSubscribers) {
            const email = mcSub.email.toLowerCase();
            const localSub = localSubscribersByEmail.get(email);
            if (localSub) {
                if (localSub.status === 'unsubscribed' && mcSub.status === 'active') {
                    mailchimpUpdates.push({
                        email: mcSub.email,
                        status: 'unsubscribed'
                    });
                    logger_1.logger.info(`Detected status mismatch for ${email}: Local=unsubscribed, Mailchimp=active`);
                    continue;
                }
                if (localSub.status === 'active' && mcSub.status === 'unsubscribed') {
                    operations.push({
                        updateOne: {
                            filter: { email: mcSub.email, createdBy: userId },
                            update: {
                                $set: {
                                    status: 'unsubscribed',
                                    name: mcSub.name,
                                    subscribed: mcSub.subscribedDate,
                                    source: 'mailchimp'
                                }
                            }
                        }
                    });
                }
            }
            else {
                operations.push({
                    updateOne: {
                        filter: { email: mcSub.email, createdBy: userId },
                        update: {
                            $set: {
                                name: mcSub.name,
                                status: mcSub.status,
                                subscribed: mcSub.subscribedDate,
                                source: 'mailchimp'
                            }
                        },
                        upsert: true
                    }
                });
            }
        }
        if (operations.length > 0) {
            await Subscriber_1.default.bulkWrite(operations);
        }
        if (mailchimpUpdates.length > 0) {
            try {
                logger_1.logger.info(`Updating ${mailchimpUpdates.length} subscribers in Mailchimp to unsubscribed`);
                for (const update of mailchimpUpdates) {
                    await mailchimpService.updateSubscriberStatus(update.email, 'unsubscribed');
                }
            }
            catch (error) {
                logger_1.logger.error('Error updating subscribers in Mailchimp:', error);
            }
        }
        return mailchimpSubscribers;
    }
    /**
     * Get all subscribers for user
     */
    async getAllSubscribers(userId) {
        try {
            await this.syncMailchimpSubscribers(userId);
        }
        catch (error) {
            logger_1.logger.error('Error syncing Mailchimp subscribers:', error);
        }
        const subscribers = await Subscriber_1.default.find({ createdBy: userId })
            .select('-__v')
            .populate('createdBy', 'email');
        return subscribers.map(sub => ({
            id: sub._id.toString(),
            email: sub.email,
            name: sub.name,
            status: sub.status,
            subscribed: sub.subscribed,
            createdBy: sub.createdBy,
            source: sub.source || 'manual'
        }));
    }
    /**
     * Create a new subscriber
     */
    async createSubscriber(email, name, userId) {
        const subscriber = await Subscriber_1.default.create({
            email,
            name,
            status: 'active',
            createdBy: userId,
            subscribed: new Date(),
            source: 'manual'
        });
        return subscriber;
    }
    /**
     * Update subscriber status (unsubscribe or reactivate)
     */
    async updateSubscriberStatus(subscriberId, status, userId) {
        const subscriber = await Subscriber_1.default.findById(subscriberId);
        if (!subscriber) {
            throw new customErrors_1.NotFoundError('Subscriber not found');
        }
        subscriber.status = status;
        await subscriber.save();
        // Sync with Mailchimp if enabled
        try {
            const settings = await Settings_1.default.findOne({ userId });
            if (settings?.mailchimp?.enabled) {
                const decryptedApiKey = getDecryptedMailchimpKey(settings);
                const mailchimpService = new mailchimp_1.MailchimpService(decryptedApiKey, settings.mailchimp.serverPrefix.trim());
                await mailchimpService.initializeList();
                const mailchimpStatus = status === 'active' ? 'subscribed' : 'unsubscribed';
                await mailchimpService.updateSubscriberStatus(subscriber.email, mailchimpStatus);
                logger_1.logger.info(`Updated Mailchimp status for ${subscriber.email} to ${mailchimpStatus}`);
            }
        }
        catch (mailchimpError) {
            logger_1.logger.error(`Failed to update Mailchimp for ${subscriber.email}:`, mailchimpError);
        }
        return subscriber;
    }
    /**
     * Bulk update subscribers to unsubscribed status
     */
    async bulkUnsubscribe(ids, userId) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new customErrors_1.ValidationError('Invalid subscriber IDs');
        }
        const validIds = ids.every(id => mongoose_1.default.Types.ObjectId.isValid(id));
        if (!validIds) {
            throw new customErrors_1.ValidationError('Invalid subscriber ID format in the list');
        }
        const subscribers = await Subscriber_1.default.find({
            _id: { $in: ids },
            createdBy: userId
        });
        if (subscribers.length === 0) {
            return 0;
        }
        const result = await Subscriber_1.default.updateMany({ _id: { $in: ids }, createdBy: userId }, { $set: { status: 'unsubscribed' } });
        // Sync with Mailchimp if enabled
        try {
            const settings = await Settings_1.default.findOne({ userId });
            if (settings?.mailchimp?.enabled) {
                const decryptedApiKey = getDecryptedMailchimpKey(settings);
                const mailchimpService = new mailchimp_1.MailchimpService(decryptedApiKey, settings.mailchimp.serverPrefix.trim());
                await mailchimpService.initializeList();
                for (const sub of subscribers) {
                    await mailchimpService.updateSubscriberStatus(sub.email, 'unsubscribed');
                }
                logger_1.logger.info(`Updated ${subscribers.length} subscribers in Mailchimp to unsubscribed`);
            }
        }
        catch (mailchimpError) {
            logger_1.logger.error('Failed to update Mailchimp for bulk unsubscribe:', mailchimpError);
        }
        return result.modifiedCount;
    }
    /**
     * Import subscribers from CSV data
     */
    async importSubscribers(csvData, userId) {
        if (!csvData) {
            throw new customErrors_1.ValidationError('CSV data is required');
        }
        const parsedData = papaparse_1.default.parse(csvData, {
            header: true,
            skipEmptyLines: true
        });
        if (parsedData.errors.length > 0) {
            throw new customErrors_1.ValidationError('CSV parsing error');
        }
        const subscribers = await Subscriber_1.default.create(parsedData.data.map((row) => ({
            ...row,
            createdBy: userId,
            status: 'active',
            source: 'csv'
        })));
        return {
            imported: subscribers.length,
            subscribers
        };
    }
    /**
     * Export subscribers to CSV format
     */
    async exportSubscribers(userId) {
        const subscribers = await Subscriber_1.default.find({ createdBy: userId });
        const csvContent = [
            ['ID', 'Email', 'Name', 'Status', 'Subscribed Date', 'Source'],
            ...subscribers.map(sub => [
                sub._id.toString(),
                sub.email,
                sub.name,
                sub.status,
                sub.subscribed ? new Date(sub.subscribed).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }) : 'N/A',
                sub.source || 'manual'
            ])
        ]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\r\n');
        return csvContent;
    }
    /**
     * Unsubscribe via token (from email link)
     */
    async unsubscribeByToken(token) {
        try {
            const subscriberId = Buffer.from(token, 'base64').toString('utf-8');
            const subscriber = await Subscriber_1.default.findById(subscriberId);
            if (!subscriber) {
                return { success: false };
            }
            subscriber.status = 'unsubscribed';
            await subscriber.save();
            // Sync with Mailchimp if enabled
            try {
                const settings = await Settings_1.default.findOne({ userId: subscriber.createdBy });
                if (settings?.mailchimp?.enabled) {
                    const decryptedApiKey = getDecryptedMailchimpKey(settings);
                    const mailchimpService = new mailchimp_1.MailchimpService(decryptedApiKey, settings.mailchimp.serverPrefix.trim());
                    await mailchimpService.initializeList();
                    await mailchimpService.updateSubscriberStatus(subscriber.email, 'unsubscribed');
                    logger_1.logger.info(`Updated Mailchimp status for ${subscriber.email} to unsubscribed via unsubscribe link`);
                }
            }
            catch (mailchimpError) {
                logger_1.logger.error(`Failed to update Mailchimp for ${subscriber.email} via unsubscribe link:`, mailchimpError);
            }
            return { success: true, subscriber };
        }
        catch (error) {
            logger_1.logger.error('Error unsubscribing by token:', error);
            return { success: false };
        }
    }
}
exports.SubscriberService = SubscriberService;
exports.subscriberService = new SubscriberService();
