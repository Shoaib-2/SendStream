"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const router = express_1.default.Router();
// Apply stricter rate limiting to auth routes
router.post('/register', rateLimiter_middleware_1.rateLimiters.auth, auth_controller_1.register);
router.post('/login', rateLimiter_middleware_1.rateLimiters.auth, auth_controller_1.login);
router.post('/logout', auth_controller_1.logout);
router.get('/check-trial-eligibility', rateLimiter_middleware_1.rateLimiters.api, auth_controller_1.checkTrialEligibility);
// Password reset with auth rate limiting
router.post('/forgot-password', rateLimiter_middleware_1.rateLimiters.auth, auth_controller_1.forgotPassword);
router.post('/reset-password/:token', rateLimiter_middleware_1.rateLimiters.auth, auth_controller_1.resetPassword);
// Add route for verifying cookie authentication
router.get('/me', rateLimiter_middleware_1.rateLimiters.api, (req, res) => {
    // The protect middleware will handle authentication
    // This route is just for verifying the cookie
    res.status(200).json({
        status: 'success',
        user: req.user
    });
});
exports.default = router;
