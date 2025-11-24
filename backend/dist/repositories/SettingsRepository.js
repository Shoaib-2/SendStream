"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsRepository = exports.SettingsRepository = void 0;
const Settings_1 = __importDefault(require("../models/Settings"));
/**
 * SettingsRepository - Data access layer for Settings model
 * Abstracts all database operations for user settings
 */
class SettingsRepository {
    /**
     * Create new settings for a user
     */
    async create(settingsData) {
        return await Settings_1.default.create(settingsData);
    }
    /**
     * Find settings by user ID
     */
    async findByUserId(userId) {
        return await Settings_1.default.findOne({ userId });
    }
    /**
     * Find settings by user ID with population
     */
    async findByUserIdWithUser(userId) {
        return await Settings_1.default.findOne({ userId }).populate('userId', 'email');
    }
    /**
     * Update settings by user ID
     */
    async updateByUserId(userId, updateData) {
        return await Settings_1.default.findOneAndUpdate({ userId }, updateData, { new: true, runValidators: true });
    }
    /**
     * Upsert settings (create if doesn't exist, update if exists)
     */
    async upsert(userId, settingsData) {
        return await Settings_1.default.findOneAndUpdate({ userId }, settingsData, {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true
        });
    }
    /**
     * Update email settings
     */
    async updateEmailSettings(userId, emailSettings) {
        const updateData = {};
        if (emailSettings.fromName)
            updateData['email.fromName'] = emailSettings.fromName;
        if (emailSettings.replyTo)
            updateData['email.replyTo'] = emailSettings.replyTo;
        if (emailSettings.senderEmail)
            updateData['email.senderEmail'] = emailSettings.senderEmail;
        return await Settings_1.default.findOneAndUpdate({ userId }, { $set: updateData }, { new: true, runValidators: true });
    }
    /**
     * Update Mailchimp settings
     */
    async updateMailchimpSettings(userId, mailchimpSettings) {
        const updateData = {};
        if (mailchimpSettings.apiKey !== undefined) {
            updateData['mailchimp.apiKey'] = mailchimpSettings.apiKey;
        }
        if (mailchimpSettings.serverPrefix !== undefined) {
            updateData['mailchimp.serverPrefix'] = mailchimpSettings.serverPrefix;
        }
        if (mailchimpSettings.enabled !== undefined) {
            updateData['mailchimp.enabled'] = mailchimpSettings.enabled;
        }
        if (mailchimpSettings.listId !== undefined) {
            updateData['mailchimp.listId'] = mailchimpSettings.listId;
        }
        if (mailchimpSettings.autoSync !== undefined) {
            updateData['mailchimp.autoSync'] = mailchimpSettings.autoSync;
        }
        return await Settings_1.default.findOneAndUpdate({ userId }, { $set: updateData }, { new: true, runValidators: true });
    }
    /**
     * Enable/disable Mailchimp integration
     */
    async toggleMailchimp(userId, enabled) {
        return await Settings_1.default.findOneAndUpdate({ userId }, { $set: { 'mailchimp.enabled': enabled } }, { new: true });
    }
    /**
     * Update Mailchimp list ID
     */
    async updateMailchimpListId(userId, listId) {
        return await Settings_1.default.findOneAndUpdate({ userId }, { $set: { 'mailchimp.listId': listId } }, { new: true });
    }
    /**
     * Delete settings by user ID
     */
    async deleteByUserId(userId) {
        return await Settings_1.default.findOneAndDelete({ userId });
    }
    /**
     * Check if settings exist for user
     */
    async exists(userId) {
        const count = await Settings_1.default.countDocuments({ userId });
        return count > 0;
    }
    /**
     * Get all settings (admin function)
     */
    async findAll() {
        return await Settings_1.default.find().populate('userId', 'email');
    }
    /**
     * Count total settings
     */
    async count() {
        return await Settings_1.default.countDocuments();
    }
    /**
     * Find settings with Mailchimp enabled
     */
    async findWithMailchimpEnabled() {
        return await Settings_1.default.find({
            'mailchimp.enabled': true
        }).populate('userId', 'email');
    }
    /**
     * Find settings with auto-sync enabled
     */
    async findWithAutoSyncEnabled() {
        return await Settings_1.default.find({
            'mailchimp.enabled': true,
            'mailchimp.autoSync': true
        }).populate('userId', 'email');
    }
    /**
     * Get Mailchimp credentials for user
     */
    async getMailchimpCredentials(userId) {
        const settings = await Settings_1.default.findOne({ userId });
        if (!settings || !settings.mailchimp) {
            return null;
        }
        return {
            apiKey: settings.mailchimp.apiKey,
            serverPrefix: settings.mailchimp.serverPrefix,
            listId: settings.mailchimp.listId,
            enabled: settings.mailchimp.enabled,
            autoSync: settings.mailchimp.autoSync
        };
    }
    /**
     * Initialize default settings for new user
     */
    async initializeForUser(userId, email) {
        return await this.create({
            userId,
            email: {
                fromName: 'Newsletter',
                replyTo: email,
                senderEmail: email
            }
        });
    }
    /**
     * Validate Mailchimp configuration
     */
    async hasValidMailchimpConfig(userId) {
        const settings = await Settings_1.default.findOne({ userId });
        return !!(settings?.mailchimp?.enabled &&
            settings.mailchimp.apiKey &&
            settings.mailchimp.serverPrefix);
    }
    /**
     * Get email configuration for user
     */
    async getEmailConfig(userId) {
        const settings = await Settings_1.default.findOne({ userId });
        return settings?.email || null;
    }
}
exports.SettingsRepository = SettingsRepository;
exports.settingsRepository = new SettingsRepository();
