"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTrialEligibility = exports.resetPassword = exports.forgotPassword = exports.logout = exports.login = exports.register = void 0;
const auth_service_1 = require("../services/auth.service");
const email_service_1 = require("../services/email.service");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Cookie configuration for security
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined
};
// Helper to create and send JWT token
const createSendToken = (user, token, statusCode, res) => {
    // Set HTTP-only cookie
    res.cookie('jwt', token, {
        ...cookieOptions,
        path: '/'
    });
    // Set authorization header for API clients
    res.setHeader('Authorization', `Bearer ${token}`);
    // Send response
    res.status(statusCode).json({
        status: 'success',
        data: {
            token,
            user
        }
    });
};
const register = async (req, res, next) => {
    try {
        const { email, password, stripeSessionId } = req.body;
        const result = await auth_service_1.authService.register({ email, password, stripeSessionId });
        return res.status(201).json({
            status: 'success',
            data: result
        });
    }
    catch (error) {
        return next(error);
    }
};
exports.register = register;
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const result = await auth_service_1.authService.login({ email, password });
        return createSendToken(result.user, result.token, 200, res);
    }
    catch (error) {
        return next(error);
    }
};
exports.login = login;
const logout = (_req, res) => {
    // Clear JWT cookie
    res.cookie('jwt', 'loggedout', {
        ...cookieOptions,
        maxAge: 1, // Expire immediately
        path: '/', // Ensure cookie is cleared from all paths
    });
    // Clear Authorization header
    res.setHeader('Authorization', '');
    // Send success response with clear instructions for client
    res.status(200).json({
        status: 'success',
        message: 'Successfully logged out',
        clearAuth: true // Signal to client to clear local storage
    });
};
exports.logout = logout;
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        const result = await auth_service_1.authService.generatePasswordResetToken(email);
        if (result) {
            try {
                const emailHTML = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your Newsletter Automation Service account.</p>
            <p>Click the button below to reset your password. This link is valid for 10 minutes.</p>
            <a href="${result.resetUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #64748b; font-size: 14px;">Newsletter Automation Service</p>
          </div>
        `;
                const senderEmail = process.env.EMAIL_USER || 'noreply@example.com';
                const mailOptions = {
                    from: senderEmail,
                    to: result.user.email,
                    subject: 'Password Reset Request',
                    html: emailHTML
                };
                await email_service_1.emailService.sendEmail(mailOptions);
            }
            catch (err) {
                await auth_service_1.authService.clearPasswordResetToken(result.user._id.toString());
                throw err;
            }
        }
        return res.status(200).json({
            status: 'success',
            message: 'If your email is registered with us, you will receive a password reset link'
        });
    }
    catch (error) {
        return next(error);
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;
        const result = await auth_service_1.authService.resetPassword(token, password);
        return createSendToken(result.user, result.token, 200, res);
    }
    catch (error) {
        return next(error);
    }
};
exports.resetPassword = resetPassword;
const checkTrialEligibility = async (req, res, next) => {
    try {
        const { email } = req.query;
        const eligibleForTrial = await auth_service_1.authService.checkTrialEligibility(email);
        return res.status(200).json({
            status: 'success',
            eligibleForTrial
        });
    }
    catch (error) {
        return next(error);
    }
};
exports.checkTrialEligibility = checkTrialEligibility;
