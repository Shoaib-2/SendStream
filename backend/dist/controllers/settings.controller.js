"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsController = exports.SettingsController = void 0;
const settings_service_1 = require("../services/settings.service");
const logger_1 = require("../utils/logger");
const cache_service_1 = require("../services/cache.service");
class SettingsController {
    async getSettings(req, res, next) {
        try {
            if (!req.user?._id)
                return next(new Error('Authentication required'));
            // Use cache for settings
            const cacheKey = cache_service_1.CacheKeys.userSettings(req.user._id);
            const settings = await cache_service_1.cacheService.getOrSet(cacheKey, async () => await settings_service_1.settingsService.getSettings(req.user._id), 5 * 60 * 1000 // Cache for 5 minutes
            );
            res.json({ status: 'success', data: settings });
        }
        catch (error) {
            logger_1.logger.error('Error fetching settings:', error);
            return next(error);
        }
    }
    async updateSettings(req, res, next) {
        try {
            if (!req.user?._id)
                return next(new Error('Authentication required'));
            const { email, mailchimp } = req.body;
            const settings = await settings_service_1.settingsService.updateSettings(req.user._id, email, mailchimp);
            // Invalidate settings cache
            cache_service_1.cacheService.delete(cache_service_1.CacheKeys.userSettings(req.user._id));
            res.json({ status: 'success', data: settings });
        }
        catch (error) {
            logger_1.logger.error('Error updating settings:', error);
            return next(error);
        }
    }
    async testIntegration(req, res, next) {
        try {
            if (!req.user?._id)
                return next(new Error('Authentication required'));
            const { type } = req.params;
            if (type !== 'mailchimp') {
                return res.status(400).json({
                    status: 'error',
                    data: {
                        success: false,
                        message: 'Invalid integration type'
                    }
                });
            }
            const { apiKey, serverPrefix } = req.body;
            const result = await settings_service_1.settingsService.testMailchimpIntegration(req.user._id, apiKey, serverPrefix);
            return res.json({
                status: 'success',
                data: result
            });
        }
        catch (error) {
            logger_1.logger.error('Integration test error:', error);
            return next(error);
        }
    }
    async enableIntegration(req, res, next) {
        try {
            if (!req.user?._id)
                return next(new Error('Authentication required'));
            const { enabled, autoSync } = req.body;
            const result = await settings_service_1.settingsService.toggleMailchimpIntegration(req.user._id, enabled, autoSync);
            // Invalidate settings cache
            cache_service_1.cacheService.delete(cache_service_1.CacheKeys.userSettings(req.user._id));
            return res.json({
                status: 'success',
                data: result
            });
        }
        catch (error) {
            logger_1.logger.error('Error enabling integration:', error);
            return next(error);
        }
    }
    async sendNewsletter(req, res, next) {
        try {
            if (!req.user?._id)
                return next(new Error('Authentication required'));
            const { subject, content } = req.body;
            const result = await settings_service_1.settingsService.sendMailchimpNewsletter(req.user._id, subject, content);
            res.json({ status: 'success', data: result });
        }
        catch (error) {
            logger_1.logger.error('Error sending newsletter:', error);
            next(error);
        }
    }
    async scheduleNewsletter(req, res, next) {
        try {
            if (!req.user?._id)
                return next(new Error('Authentication required'));
            const { campaignId, sendTime } = req.body;
            const result = await settings_service_1.settingsService.scheduleMailchimpNewsletter(req.user._id, campaignId, new Date(sendTime));
            res.json({ status: 'success', data: result });
        }
        catch (error) {
            logger_1.logger.error('Error scheduling newsletter:', error);
            next(error);
        }
    }
    async getSubscriberStats(req, res, next) {
        try {
            if (!req.user?._id)
                return next(new Error('Authentication required'));
            const stats = await settings_service_1.settingsService.getMailchimpSubscriberStats(req.user._id);
            res.json({ status: 'success', data: stats });
        }
        catch (error) {
            logger_1.logger.error('Error getting subscriber stats:', error);
            next(error);
        }
    }
    async syncSubscribers(req, res, next) {
        try {
            if (!req.user?._id)
                return next(new Error('Authentication required'));
            const subscribers = await settings_service_1.settingsService.syncMailchimpSubscribers(req.user._id);
            res.json({ status: 'success', data: subscribers });
        }
        catch (error) {
            logger_1.logger.error('Error syncing subscribers:', error);
            next(error);
        }
    }
    async getCampaignStats(req, res, next) {
        try {
            if (!req.user?._id)
                return next(new Error('Authentication required'));
            const { campaignId } = req.params;
            const stats = await settings_service_1.settingsService.getMailchimpCampaignStats(req.user._id, campaignId);
            res.json({ status: 'success', data: stats });
        }
        catch (error) {
            logger_1.logger.error('Error getting campaign stats:', error);
            next(error);
        }
    }
}
exports.SettingsController = SettingsController;
exports.settingsController = new SettingsController();
