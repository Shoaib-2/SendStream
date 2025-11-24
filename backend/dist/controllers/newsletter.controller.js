"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsletterController = exports.NewsletterController = void 0;
const ws_1 = __importDefault(require("ws"));
const server_1 = require("../server");
const newsletter_service_1 = require("../services/newsletter.service");
const logger_1 = require("../utils/logger");
class NewsletterController {
    async create(req, res, next) {
        try {
            if (!req.user)
                return next(new Error('Authentication required'));
            const newsletter = await newsletter_service_1.newsletterService.createNewsletter(req.body, req.user._id);
            res.status(201).json({
                status: "success",
                data: newsletter
            });
        }
        catch (error) {
            next(error);
        }
    }
    ;
    async getNewsletterStats(req, res, next) {
        try {
            if (!req.user)
                return next(new Error('Authentication required'));
            const data = await newsletter_service_1.newsletterService.getNewsletterStats(req.user._id);
            res.json({
                status: "success",
                data
            });
        }
        catch (error) {
            next(error);
        }
    }
    ;
    async getAll(req, res, next) {
        try {
            if (!req.user)
                return next(new Error('Authentication required'));
            const newsletters = await newsletter_service_1.newsletterService.getAllNewsletters(req.user._id);
            res.json({
                status: "success",
                data: newsletters,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getOne(req, res, next) {
        try {
            if (!req.user)
                return next(new Error('Authentication required'));
            const newsletter = await newsletter_service_1.newsletterService.getNewsletterById(req.params.id, req.user._id);
            res.json({
                status: "success",
                data: newsletter,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async update(req, res, next) {
        try {
            if (!req.user)
                return next(new Error('Authentication required'));
            const updatedNewsletter = await newsletter_service_1.newsletterService.updateNewsletter(req.params.id, req.body);
            res.json({
                status: "success",
                data: updatedNewsletter
            });
        }
        catch (error) {
            return next(error);
        }
    }
    ;
    async schedule(req, res, next) {
        try {
            if (!req.user)
                return next(new Error('Authentication required'));
            const { scheduledDate } = req.body;
            const updatedNewsletter = await newsletter_service_1.newsletterService.scheduleNewsletter(req.params.id, scheduledDate, req.user._id);
            return res.json({
                status: "success",
                data: updatedNewsletter
            });
        }
        catch (error) {
            return next(error);
        }
    }
    async delete(req, res, next) {
        try {
            await newsletter_service_1.newsletterService.deleteNewsletter(req.params.id);
            res.status(204).send();
        }
        catch (error) {
            logger_1.logger.error("Error deleting newsletter:", error);
            next(error);
        }
    }
    async send(req, res, next) {
        try {
            if (!req.user)
                return next(new Error('Authentication required'));
            const result = await newsletter_service_1.newsletterService.sendNewsletter(req.params.id, req.user._id);
            return res.json({
                status: "success",
                data: result.newsletter,
                message: result.message
            });
        }
        catch (error) {
            return next(error);
        }
    }
    async sendScheduledNewsletter(newsletterId) {
        try {
            const updatedNewsletter = await newsletter_service_1.newsletterService.sendScheduledNewsletter(newsletterId);
            if (updatedNewsletter) {
                server_1.wss.clients.forEach((client) => {
                    if (client.readyState === ws_1.default.OPEN) {
                        if (client.user && client.user._id === updatedNewsletter.createdBy.toString()) {
                            client.send(JSON.stringify({
                                type: "newsletter_update",
                                newsletter: updatedNewsletter,
                            }));
                        }
                        else {
                            const limitedInfo = {
                                _id: updatedNewsletter._id,
                                status: updatedNewsletter.status,
                                lastUpdated: new Date().toISOString()
                            };
                            client.send(JSON.stringify({
                                type: "newsletter_update",
                                newsletter: limitedInfo,
                            }));
                        }
                    }
                });
            }
        }
        catch (error) {
            logger_1.logger.error("Failed to send scheduled newsletter:", error);
            return;
        }
    }
}
exports.NewsletterController = NewsletterController;
exports.newsletterController = new NewsletterController();
