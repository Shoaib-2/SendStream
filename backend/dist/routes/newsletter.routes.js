"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const newsletter_controller_1 = require("../controllers/newsletter.controller");
const auth_middleware_1 = require("../middleware/auth/auth.middleware");
const susbcription_middleware_1 = require("../middleware/susbcription.middleware");
const router = express_1.default.Router();
// Apply auth middleware
router.use(auth_middleware_1.protect);
// Add subscription check for premium features
router.use(susbcription_middleware_1.checkSubscription);
router.route('/')
    .get((req, res, next) => newsletter_controller_1.newsletterController.getAll(req, res, next))
    .post((req, res, next) => newsletter_controller_1.newsletterController.create(req, res, next));
router.get('/stats', (req, res, next) => newsletter_controller_1.newsletterController.getNewsletterStats(req, res, next));
router.route('/:id')
    .get(newsletter_controller_1.newsletterController.getOne)
    .patch(newsletter_controller_1.newsletterController.update)
    .delete(newsletter_controller_1.newsletterController.delete);
// Fix the send route by casting to RequestHandler
router.post('/:id/send', newsletter_controller_1.newsletterController.send);
// Fix the schedule route
router.route('/:id/schedule').post(async (req, res, next) => {
    await newsletter_controller_1.newsletterController.schedule(req, res, next);
});
// Public route for tracking - no auth/subscription required
router.get('/newsletters/track-open/:newsletterId/:subscriberId', async (req, res, _next) => {
    try {
        const { newsletterId, subscriberId } = req.params;
        console.log('Tracking open:', { newsletterId, subscriberId });
        res.setHeader('Content-Type', 'image/gif');
        res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
    }
    catch (error) {
        console.error('Tracking pixel error:', error);
        res.status(500).send('Tracking error');
    }
});
exports.default = router;
