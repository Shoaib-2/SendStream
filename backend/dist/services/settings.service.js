"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsService = exports.SettingsService = void 0;
const Settings_1 = __importDefault(require("../models/Settings"));
const customErrors_1 = require("../utils/customErrors");
const logger_1 = require("../utils/logger");
const mailchimp_1 = require("./Integrations/mailchimp");
/**
 * Helper to get decrypted Mailchimp API key from settings
 */
function getDecryptedMailchimpKey(settings) {
    if (!settings.mailchimp?.apiKey) {
        throw new Error('Mailchimp API key not found');
    }
    return settings.getDecryptedMailchimpApiKey() || settings.mailchimp.apiKey;
}
class SettingsService {
    /**
     * Get user settings
     */
    async getSettings(userId) {
        const settings = await Settings_1.default.findOne({ userId });
        if (!settings) {
            return {
                email: { fromName: '', replyTo: '', senderEmail: '' },
                mailchimp: {
                    apiKey: '',
                    serverPrefix: '',
                    enabled: false,
                    autoSync: false
                },
            };
        }
        // Hide full API key when returning settings
        const sanitizedSettings = {
            ...settings.toObject(),
            mailchimp: {
                ...(settings.mailchimp || {}),
                apiKey: settings.mailchimp?.apiKey ? '••••••••' + settings.mailchimp.apiKey.slice(-4) : '',
            }
        };
        return sanitizedSettings;
    }
    /**
     * Update user settings
     */
    async updateSettings(userId, email, mailchimp) {
        const existingSettings = await Settings_1.default.findOne({ userId });
        const updatedMailchimp = { ...(existingSettings?.mailchimp || {}), ...(mailchimp || {}) };
        // If API key is masked and existing key exists, keep the existing key
        if (updatedMailchimp.apiKey?.startsWith('••••••••') && existingSettings?.mailchimp?.apiKey) {
            updatedMailchimp.apiKey = existingSettings.mailchimp.apiKey;
        }
        const updatedEmail = {
            ...(existingSettings?.email || { fromName: '', replyTo: '', senderEmail: '' }),
            ...(email || {})
        };
        const settings = await Settings_1.default.findOneAndUpdate({ userId }, {
            email: updatedEmail,
            mailchimp: updatedMailchimp
        }, { new: true, upsert: true, runValidators: true });
        // Return response with masked API key
        const sanitizedSettings = {
            ...settings.toObject(),
            mailchimp: {
                ...(settings.mailchimp || {}),
                apiKey: settings.mailchimp?.apiKey ? '••••••••' + settings.mailchimp.apiKey.slice(-4) : '',
            }
        };
        return sanitizedSettings;
    }
    /**
     * Test Mailchimp integration
     */
    async testMailchimpIntegration(userId, apiKey, serverPrefix) {
        let settings = await Settings_1.default.findOne({ userId });
        if (!settings) {
            logger_1.logger.info('Creating default settings for user');
            settings = new Settings_1.default({
                userId,
                email: { fromName: '', replyTo: '', senderEmail: '' },
                mailchimp: {
                    apiKey: '',
                    serverPrefix: '',
                    enabled: false,
                    autoSync: false
                }
            });
            await settings.save();
        }
        if (!settings.mailchimp) {
            settings.mailchimp = {
                apiKey: '',
                serverPrefix: '',
                enabled: false,
                autoSync: false
            };
            await settings.save();
        }
        const mailchimpApiKey = apiKey || settings.mailchimp.apiKey || '';
        const mailchimpServerPrefix = serverPrefix || settings.mailchimp.serverPrefix || '';
        if (!mailchimpApiKey || !mailchimpServerPrefix) {
            throw new customErrors_1.ValidationError('Mailchimp API key and server prefix are required');
        }
        logger_1.logger.info('Testing Mailchimp with provided credentials');
        const mailchimpService = new mailchimp_1.MailchimpService(mailchimpApiKey, mailchimpServerPrefix);
        const result = await mailchimpService.testConnection();
        // If test successful and using new credentials, update settings
        if (result.success && (apiKey || serverPrefix)) {
            if (apiKey)
                settings.mailchimp.apiKey = apiKey;
            if (serverPrefix)
                settings.mailchimp.serverPrefix = serverPrefix;
            if (result.listId) {
                settings.mailchimp.listId = result.listId;
            }
            await settings.save();
            logger_1.logger.info('Updated settings with new credentials after successful test');
        }
        return result;
    }
    /**
     * Enable or disable Mailchimp integration
     */
    async toggleMailchimpIntegration(userId, enabled, autoSync) {
        const settings = await Settings_1.default.findOne({ userId });
        if (!settings) {
            throw new customErrors_1.NotFoundError('Settings not found');
        }
        if (enabled && (!settings.mailchimp?.apiKey || !settings.mailchimp?.serverPrefix)) {
            throw new customErrors_1.ValidationError('Mailchimp API key and server prefix are required');
        }
        if (!settings.mailchimp) {
            settings.mailchimp = {
                apiKey: '',
                serverPrefix: '',
                enabled: false,
                autoSync: false
            };
        }
        if (enabled) {
            const decryptedApiKey = getDecryptedMailchimpKey(settings);
            const mailchimpService = new mailchimp_1.MailchimpService(decryptedApiKey, settings.mailchimp.serverPrefix);
            const result = await mailchimpService.testConnection();
            if (!result.success) {
                throw new customErrors_1.ValidationError('Connection test failed: ' + result.message);
            }
            if (result.listId) {
                settings.mailchimp.listId = result.listId;
            }
        }
        settings.mailchimp.enabled = enabled;
        if (autoSync !== undefined) {
            settings.mailchimp.autoSync = autoSync;
        }
        await settings.save();
        return {
            enabled: settings.mailchimp.enabled,
            autoSync: settings.mailchimp.autoSync
        };
    }
    /**
     * Send newsletter via Mailchimp
     */
    async sendMailchimpNewsletter(userId, subject, content) {
        const settings = await Settings_1.default.findOne({ userId });
        if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
            throw new customErrors_1.ValidationError('Mailchimp is not enabled or configured');
        }
        const decryptedApiKey = getDecryptedMailchimpKey(settings);
        const mailchimpService = new mailchimp_1.MailchimpService(decryptedApiKey, settings.mailchimp.serverPrefix);
        await mailchimpService.initializeList();
        const result = await mailchimpService.sendNewsletter({ subject, content });
        return result;
    }
    /**
     * Schedule newsletter via Mailchimp
     */
    async scheduleMailchimpNewsletter(userId, campaignId, sendTime) {
        const settings = await Settings_1.default.findOne({ userId });
        if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
            throw new customErrors_1.ValidationError('Mailchimp is not enabled or configured');
        }
        const decryptedApiKey = getDecryptedMailchimpKey(settings);
        const mailchimpService = new mailchimp_1.MailchimpService(decryptedApiKey, settings.mailchimp.serverPrefix);
        await mailchimpService.initializeList();
        const result = await mailchimpService.scheduleNewsletter(campaignId, sendTime);
        return result;
    }
    /**
     * Get Mailchimp subscriber stats
     */
    async getMailchimpSubscriberStats(userId) {
        const settings = await Settings_1.default.findOne({ userId });
        if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
            throw new customErrors_1.ValidationError('Mailchimp is not enabled or configured');
        }
        const decryptedApiKey = getDecryptedMailchimpKey(settings);
        const mailchimpService = new mailchimp_1.MailchimpService(decryptedApiKey, settings.mailchimp.serverPrefix);
        await mailchimpService.initializeList();
        const stats = await mailchimpService.getSubscriberStats();
        return stats;
    }
    /**
     * Sync Mailchimp subscribers
     */
    async syncMailchimpSubscribers(userId) {
        const settings = await Settings_1.default.findOne({ userId });
        if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
            throw new customErrors_1.ValidationError('Mailchimp is not enabled or configured');
        }
        const decryptedApiKey = getDecryptedMailchimpKey(settings);
        const mailchimpService = new mailchimp_1.MailchimpService(decryptedApiKey, settings.mailchimp.serverPrefix);
        await mailchimpService.initializeList();
        const subscribers = await mailchimpService.syncSubscribers();
        return subscribers;
    }
    /**
     * Get Mailchimp campaign stats
     */
    async getMailchimpCampaignStats(userId, campaignId) {
        const settings = await Settings_1.default.findOne({ userId });
        if (!settings?.mailchimp?.enabled || !settings?.mailchimp?.apiKey) {
            throw new customErrors_1.ValidationError('Mailchimp is not enabled or configured');
        }
        const decryptedApiKey = getDecryptedMailchimpKey(settings);
        const mailchimpService = new mailchimp_1.MailchimpService(decryptedApiKey, settings.mailchimp.serverPrefix);
        await mailchimpService.initializeList();
        const stats = await mailchimpService.getCampaignStats(campaignId);
        return stats;
    }
}
exports.SettingsService = SettingsService;
exports.settingsService = new SettingsService();
