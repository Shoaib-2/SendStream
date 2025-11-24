"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/email.routes.ts
const express_1 = __importDefault(require("express"));
const email_controller_1 = require("../controllers/email.controller");
const auth_middleware_1 = require("../middleware/auth/auth.middleware");
const rateLimiter_middleware_1 = require("../middleware/rateLimiter.middleware");
const router = express_1.default.Router();
router.get('/usage', auth_middleware_1.protect, rateLimiter_middleware_1.rateLimiters.analytics, email_controller_1.emailController.getUsage);
router.post('/newsletter/:newsletterId/send', auth_middleware_1.protect, rateLimiter_middleware_1.rateLimiters.email, // Strict rate limiting for email sending
email_controller_1.emailController.sendNewsletter);
exports.default = router;
