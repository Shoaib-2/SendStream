"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhook = exports.getSubscriptionStatus = exports.cancelSubscription = exports.createCheckoutSession = void 0;
const stripe_1 = __importDefault(require("../services/Integrations/stripe"));
const createCheckoutSession = async (req, res) => {
    try {
        const { priceId, successUrl, cancelUrl } = req.body;
        if (!priceId) {
            return res.status(400).json({ error: 'Price ID is required' });
        }
        const session = await stripe_1.default.createCheckoutSession(priceId, successUrl, cancelUrl);
        return res.status(200).json({ sessionId: session.id });
    }
    catch (error) {
        console.error('Error creating checkout session:', error);
        return res.status(500).json({ error: 'Failed to create checkout session' });
    }
};
exports.createCheckoutSession = createCheckoutSession;
const cancelSubscription = async (req, res) => {
    try {
        const { subscriptionId } = req.body;
        if (!subscriptionId) {
            return res.status(400).json({ error: 'Subscription ID is required' });
        }
        const subscription = await stripe_1.default.cancelSubscription(subscriptionId);
        return res.status(200).json({ subscription });
    }
    catch (error) {
        console.error('Error canceling subscription:', error);
        return res.status(500).json({ error: 'Failed to cancel subscription' });
    }
};
exports.cancelSubscription = cancelSubscription;
const getSubscriptionStatus = async (req, res) => {
    try {
        // Get customer ID from authenticated user session
        const customerId = req.user?.stripeCustomerId;
        if (!customerId) {
            return res.status(400).json({ error: 'Customer ID is required' });
        }
        const subscriptions = await stripe_1.default.getCustomerSubscriptions(customerId);
        return res.status(200).json({ subscriptions });
    }
    catch (error) {
        console.error('Error fetching subscription status:', error);
        return res.status(500).json({ error: 'Failed to fetch subscription status' });
    }
};
exports.getSubscriptionStatus = getSubscriptionStatus;
const handleWebhook = async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
        return res.status(400).json({ error: 'Stripe signature is required' });
    }
    try {
        await stripe_1.default.handleWebhookEvent(req.body, signature);
        return res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('Webhook error:', error);
        return res.status(400).json({ error: 'Webhook error' });
    }
};
exports.handleWebhook = handleWebhook;
exports.default = {
    createCheckoutSession: exports.createCheckoutSession,
    cancelSubscription: exports.cancelSubscription,
    getSubscriptionStatus: exports.getSubscriptionStatus,
    handleWebhook: exports.handleWebhook
};
