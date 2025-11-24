"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const error_middleware_1 = require("../middleware/error.middleware");
const subs_controller_1 = require("../controllers/subs.controller");
const auth_middleware_1 = require("../middleware/auth/auth.middleware");
const susbcription_middleware_1 = require("../middleware/susbcription.middleware");
const router = (0, express_1.Router)();
// Public unsubscribe route - no auth required
router.get('/unsubscribe/:token', (0, error_middleware_1.asyncHandler)(subs_controller_1.unsubscribeSubscriber));
// Protected routes - fix the type error by casting protect to RequestHandler
router.use(auth_middleware_1.protect);
// Add subscription check for premium features
router.use(susbcription_middleware_1.checkSubscription);
router.route('/').get(subs_controller_1.getSubscribers).post(subs_controller_1.createSubscriber);
router.route('/import').post((0, error_middleware_1.asyncHandler)(subs_controller_1.importSubscribers));
router.route('/export').get(subs_controller_1.exportSubscribers);
router.route('/:id/status').patch((0, error_middleware_1.asyncHandler)(subs_controller_1.updateSubscriber));
router.route('/bulk-delete').post((0, error_middleware_1.asyncHandler)(subs_controller_1.bulkDeleteSubscribers));
router.route('/:id').delete((0, error_middleware_1.asyncHandler)(subs_controller_1.deleteSubscriber));
exports.default = router;
