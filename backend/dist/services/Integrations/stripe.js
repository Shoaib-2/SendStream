"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleWebhookEvent = exports.cancelSubscription = exports.getCustomerSubscriptions = exports.createCheckoutSession = void 0;
const stripe_1 = __importDefault(require("stripe"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("../../models/User"));
dotenv_1.default.config();
// Initialize Stripe with your secret key
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia',
});
// Create a checkout session for subscription with trial
const createCheckoutSession = async (priceId, successUrl, cancelUrl) => {
    return await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'subscription',
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        subscription_data: {
            trial_period_days: 14,
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        automatic_tax: { enabled: true },
    });
};
exports.createCheckoutSession = createCheckoutSession;
const getCustomerSubscriptions = async (customerId) => {
    const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        expand: ['data.default_payment_method'],
    });
    return subscriptions.data;
};
exports.getCustomerSubscriptions = getCustomerSubscriptions;
// Cancel a subscription (can be used for canceling trial)
const cancelSubscription = async (subscriptionId) => {
    return await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
    });
};
exports.cancelSubscription = cancelSubscription;
// Handle webhook events
const handleWebhookEvent = async (payload, signature) => {
    const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                const subscription = event.data.object;
                const user = await User_1.default.findOne({
                    stripeCustomerId: subscription.customer
                });
                if (user) {
                    const statusMapping = {
                        'active': 'active',
                        'trialing': 'trialing',
                        'past_due': 'past_due',
                        'canceled': 'canceled',
                        'unpaid': 'unpaid',
                        'incomplete': null
                    };
                    user.subscriptionStatus = statusMapping[subscription.status] || null;
                    user.stripeSubscriptionId = subscription.id;
                    user.trialEndsAt = subscription.trial_end
                        ? new Date(subscription.trial_end * 1000)
                        : undefined;
                    await user.save();
                }
                break;
            case 'customer.subscription.deleted':
                const deletedSubscription = event.data.object;
                await User_1.default.findOneAndUpdate({ stripeCustomerId: deletedSubscription.customer }, {
                    subscriptionStatus: 'canceled',
                    stripeSubscriptionId: undefined,
                    trialEndsAt: undefined
                });
                break;
        }
    }
    catch (error) {
        console.error('Webhook event processing error:', error);
    }
    return event;
};
exports.handleWebhookEvent = handleWebhookEvent;
exports.default = {
    createCheckoutSession: exports.createCheckoutSession,
    cancelSubscription: exports.cancelSubscription,
    getCustomerSubscriptions: exports.getCustomerSubscriptions,
    handleWebhookEvent: exports.handleWebhookEvent
};
