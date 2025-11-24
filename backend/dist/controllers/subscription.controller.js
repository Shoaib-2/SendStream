"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRenewal = exports.cancelSubscription = exports.getStatus = void 0;
const stripe_1 = __importDefault(require("stripe"));
const User_1 = __importDefault(require("../models/User"));
// Initialize Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-02-24.acacia' // Use the latest API version,
});
/**
 * Get subscription status for the authenticated user
 */
const getStatus = async (req, res) => {
    try {
        // Get user with Stripe fields
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        // If no subscription exists, return empty status
        if (!user.stripeSubscriptionId) {
            return res.status(200).json({
                status: 'success',
                data: {
                    hasSubscription: false,
                    subscription: null
                }
            });
        }
        // Get subscription details from Stripe
        try {
            const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            // Return subscription details
            return res.status(200).json({
                status: 'success',
                data: {
                    hasSubscription: true,
                    subscription: {
                        id: subscription.id,
                        status: subscription.status,
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end,
                        trialEnd: subscription.trial_end
                            ? new Date(subscription.trial_end * 1000)
                            : null
                    }
                }
            });
        }
        catch (stripeError) {
            console.error('Error retrieving Stripe subscription:', stripeError);
            // Return basic subscription info from database if Stripe retrieval fails
            return res.status(200).json({
                status: 'success',
                data: {
                    hasSubscription: true,
                    subscription: {
                        id: user.stripeSubscriptionId,
                        status: user.subscriptionStatus,
                        trialEnd: user.trialEndsAt
                    },
                    error: 'Could not retrieve complete subscription details'
                }
            });
        }
    }
    catch (error) {
        console.error('Error getting subscription status:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to get subscription status'
        });
    }
};
exports.getStatus = getStatus;
/**
 * Cancel the user's subscription (at period end)
 */
const cancelSubscription = async (req, res) => {
    try {
        // Get user with Stripe fields
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        // Check if user has a subscription
        if (!user.stripeSubscriptionId) {
            return res.status(400).json({
                status: 'error',
                message: 'No active subscription found'
            });
        }
        try {
            // First, check the current state of the subscription
            const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
            // If subscription is already canceled, just update the user's DB record
            if (existingSubscription.status === 'canceled') {
                // Update user's subscription status if it doesn't match
                if (user.subscriptionStatus !== 'canceled') {
                    user.subscriptionStatus = 'canceled';
                    await user.save();
                }
                return res.status(200).json({
                    status: 'success',
                    data: {
                        message: 'Subscription already canceled',
                        willEndOn: new Date(existingSubscription.current_period_end * 1000)
                    }
                });
            }
            // Only attempt to cancel at period end if not already canceled
            const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
                cancel_at_period_end: true
            });
            // Update user's subscription status
            user.subscriptionStatus = subscription.status;
            await user.save();
            return res.status(200).json({
                status: 'success',
                data: {
                    message: 'Subscription canceled successfully',
                    willEndOn: new Date(subscription.current_period_end * 1000)
                }
            });
        }
        catch (stripeError) {
            console.error('Error canceling Stripe subscription:', stripeError);
            // If we get "canceled subscription" error, update the user record
            if (stripeError.type === 'StripeInvalidRequestError' &&
                stripeError.raw?.message?.includes('canceled subscription')) {
                user.subscriptionStatus = 'canceled';
                await user.save();
                return res.status(200).json({
                    status: 'success',
                    data: {
                        message: 'Subscription already canceled',
                        // We don't have current_period_end here, so just use trialEndsAt or current date
                        willEndOn: user.trialEndsAt || new Date()
                    }
                });
            }
            return res.status(400).json({
                status: 'error',
                message: 'Failed to cancel subscription with Stripe'
            });
        }
    }
    catch (error) {
        console.error('Error canceling subscription:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to cancel subscription'
        });
    }
};
exports.cancelSubscription = cancelSubscription;
const updateRenewal = async (req, res) => {
    try {
        const { subscriptionId, cancelAtPeriodEnd } = req.body;
        // Validate request parameters
        if (!subscriptionId) {
            return res.status(400).json({
                status: 'error',
                message: 'Subscription ID is required'
            });
        }
        if (typeof cancelAtPeriodEnd !== 'boolean') {
            return res.status(400).json({
                status: 'error',
                message: 'cancelAtPeriodEnd must be a boolean value'
            });
        }
        // Get user from request
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        // Verify the subscription belongs to this user
        if (user.stripeSubscriptionId !== subscriptionId) {
            return res.status(403).json({
                status: 'error',
                message: 'Subscription does not belong to this user'
            });
        }
        try {
            // Update the subscription in Stripe
            const subscription = await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: cancelAtPeriodEnd
            });
            // Return the updated subscription
            return res.status(200).json({
                status: 'success',
                data: {
                    subscription: {
                        id: subscription.id,
                        status: subscription.status,
                        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                        cancelAtPeriodEnd: subscription.cancel_at_period_end
                    }
                },
                message: cancelAtPeriodEnd ?
                    'Auto-renewal has been disabled' :
                    'Auto-renewal has been enabled'
            });
        }
        catch (stripeError) {
            console.error('Error updating subscription in Stripe:', stripeError);
            return res.status(400).json({
                status: 'error',
                message: 'Failed to update subscription settings in Stripe'
            });
        }
    }
    catch (error) {
        console.error('Error updating subscription renewal:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to update subscription renewal settings'
        });
    }
};
exports.updateRenewal = updateRenewal;
