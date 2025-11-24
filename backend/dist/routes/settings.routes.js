"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const settings_controller_1 = require("../controllers/settings.controller");
const auth_middleware_1 = require("../middleware/auth/auth.middleware");
const susbcription_middleware_1 = require("../middleware/susbcription.middleware");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_middleware_1.protect);
// Add subscription check for premium features
router.use(susbcription_middleware_1.checkSubscription);
// Helper to convert class methods to route handlers
const asyncHandler = (fn) => (req, res, next) => {
    return Promise.resolve(fn(req, res, next)).catch(next);
};
// Get and update settings
router.get('/', asyncHandler((req, res, next) => settings_controller_1.settingsController.getSettings(req, res, next)));
router.put('/', asyncHandler((req, res, next) => settings_controller_1.settingsController.updateSettings(req, res, next)));
// Test and enable integrations
router.post('/test/:type', asyncHandler((req, res, next) => settings_controller_1.settingsController.testIntegration(req, res, next)));
router.post('/enable/:type', asyncHandler((req, res, next) => settings_controller_1.settingsController.enableIntegration(req, res, next)));
// Mailchimp operations
router.post('/newsletter', asyncHandler((req, res, next) => settings_controller_1.settingsController.sendNewsletter(req, res, next)));
router.post('/newsletter/schedule', asyncHandler((req, res, next) => settings_controller_1.settingsController.scheduleNewsletter(req, res, next)));
router.get('/subscribers/stats', asyncHandler((req, res, next) => settings_controller_1.settingsController.getSubscriberStats(req, res, next)));
router.get('/campaigns/:campaignId/stats', asyncHandler((req, res, next) => settings_controller_1.settingsController.getCampaignStats(req, res, next)));
router.post('/sync-subscribers', asyncHandler((req, res, next) => settings_controller_1.settingsController.syncSubscribers(req, res, next)));
exports.default = router;
