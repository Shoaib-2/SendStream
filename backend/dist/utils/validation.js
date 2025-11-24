"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePasswordStrength = validatePasswordStrength;
exports.validateListResponse = validateListResponse;
exports.validateCampaignResponse = validateCampaignResponse;
exports.validateMemberResponse = validateMemberResponse;
exports.validateApiResponse = validateApiResponse;
const logger_1 = require("./logger");
/**
 * Validate password strength
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
function validatePasswordStrength(password) {
    const errors = [];
    if (!password || password.length < 12) {
        errors.push('Password must be at least 12 characters long');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\'":\\|,.<>/?)');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
// Validation functions
function validateListResponse(response) {
    if (!response || typeof response !== 'object') {
        throw new Error('Invalid response: expected an object');
    }
    const data = response;
    if (!Array.isArray(data.lists)) {
        throw new Error('Invalid response: lists property must be an array');
    }
    if (typeof data.total_items !== 'number') {
        throw new Error('Invalid response: total_items must be a number');
    }
    data.lists.forEach((list, index) => {
        if (!list || typeof list !== 'object') {
            throw new Error(`Invalid list at index ${index}: must be an object`);
        }
        const listObj = list;
        if (!listObj.id || typeof listObj.id !== 'string') {
            throw new Error(`Invalid list at index ${index}: missing or invalid id`);
        }
        if (!listObj.stats || typeof listObj.stats !== 'object') {
            throw new Error(`Invalid list at index ${index}: missing or invalid stats`);
        }
    });
    return data;
}
function validateCampaignResponse(response) {
    if (!response || typeof response !== 'object') {
        throw new Error('Invalid campaign response: expected an object');
    }
    const data = response;
    if (!data.id || typeof data.id !== 'string') {
        throw new Error('Invalid campaign response: missing or invalid id');
    }
    if (!data.settings || typeof data.settings !== 'object') {
        throw new Error('Invalid campaign response: missing or invalid settings');
    }
    const settings = data.settings;
    const requiredSettings = ['subject_line', 'from_name', 'reply_to'];
    requiredSettings.forEach(setting => {
        if (!settings[setting] || typeof settings[setting] !== 'string') {
            throw new Error(`Invalid campaign response: missing or invalid ${setting}`);
        }
    });
    return data;
}
function validateMemberResponse(response) {
    if (!response || typeof response !== 'object') {
        throw new Error('Invalid member response: expected an object');
    }
    const data = response;
    if (!Array.isArray(data.members)) {
        throw new Error('Invalid member response: members must be an array');
    }
    data.members.forEach((member, index) => {
        if (!member || typeof member !== 'object') {
            throw new Error(`Invalid member at index ${index}: must be an object`);
        }
        const memberObj = member;
        if (!memberObj.email_address || typeof memberObj.email_address !== 'string') {
            throw new Error(`Invalid member at index ${index}: missing or invalid email_address`);
        }
        if (!memberObj.status || typeof memberObj.status !== 'string') {
            throw new Error(`Invalid member at index ${index}: missing or invalid status`);
        }
    });
    return data;
}
// Helper function to safely validate and log API responses
function validateApiResponse(response, validator, context) {
    try {
        const validatedResponse = validator(response);
        logger_1.logger.info(`Successfully validated ${context} response`);
        return validatedResponse;
    }
    catch (error) {
        logger_1.logger.error(`Validation error in ${context}:`, error);
        logger_1.logger.error('Received response:', response);
        throw error;
    }
}
