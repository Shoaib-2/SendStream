"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/analytics.routes.ts
const express_1 = __importDefault(require("express"));
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middleware/auth/auth.middleware");
const susbcription_middleware_1 = require("../middleware/susbcription.middleware");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
// Apply auth middleware to all protected routes
router.use(auth_middleware_1.protect);
// Add subscription check for premium features
router.use(susbcription_middleware_1.checkSubscription);
router.get('/newsletter/:newsletterId', analytics_controller_1.analyticsController.getNewsletterAnalytics);
router.get('/summary', (req, res, next) => {
    const requestTime = Math.floor(Date.now());
    const lastRequestTime = req.app.locals.lastSummaryRequest;
    // Prevent duplicate requests within 2 seconds
    if (lastRequestTime && requestTime - lastRequestTime < 2000) {
        res.json(req.app.locals.lastSummaryData || {});
        return;
    }
    req.app.locals.lastSummaryRequest = requestTime;
    (0, dashboard_controller_1.getDashboardSummary)(req, res, next)
        .then(data => {
        req.app.locals.lastSummaryData = data;
    })
        .catch(next);
});
router.get('/growth', analytics_controller_1.analyticsController.getGrowthData);
router.get('/activity', analytics_controller_1.analyticsController.getRecentActivity);
const TRACKING_PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
// Public route for tracking pixel - no auth/subscription required
router.get('/track-open/:newsletterId/:subscriberId', async (req, res, _next) => {
    const { newsletterId, subscriberId } = req.params;
    logger_1.logger.info('Received open tracking request', { newsletterId, subscriberId });
    try {
        res.setHeader("Content-Type", "image/gif");
        res.send(TRACKING_PIXEL);
    }
    catch (error) {
        logger_1.logger.error('Error tracking open:', error);
        res.setHeader("Content-Type", "image/gif");
        res.send(TRACKING_PIXEL);
    }
});
exports.default = router;
