"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const encryption_1 = require("../utils/encryption");
const settingsSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    email: {
        fromName: { type: String, required: true },
        replyTo: { type: String, required: true },
        senderEmail: { type: String, required: true }
    },
    mailchimp: {
        apiKey: String,
        serverPrefix: String,
        enabled: { type: Boolean, default: false },
        listId: String,
        autoSync: { type: Boolean, default: false }
    },
}, {
    timestamps: true
});
// Encrypt Mailchimp API key before saving
settingsSchema.pre('save', function (next) {
    if (this.isModified('mailchimp.apiKey') && this.mailchimp?.apiKey) {
        try {
            // Only encrypt if it's not already encrypted (check if it's a valid base64 string with our format)
            // This prevents double encryption
            const apiKey = this.mailchimp.apiKey;
            if (!isEncrypted(apiKey)) {
                this.mailchimp.apiKey = (0, encryption_1.encrypt)(apiKey);
            }
        }
        catch (error) {
            return next(error);
        }
    }
    next();
});
// Helper function to check if a value is already encrypted
function isEncrypted(value) {
    // Our encrypted values are base64 and have minimum length due to IV + tag + data
    // If it's not base64 or too short, it's not encrypted
    try {
        const buffer = Buffer.from(value, 'base64');
        // Encrypted values should be at least IV_LENGTH + TAG_LENGTH + some data
        return buffer.length > 32 && value === buffer.toString('base64');
    }
    catch {
        return false;
    }
}
// Add method to get decrypted API key
settingsSchema.methods.getDecryptedMailchimpApiKey = function () {
    if (!this.mailchimp?.apiKey) {
        return undefined;
    }
    try {
        return (0, encryption_1.decrypt)(this.mailchimp.apiKey);
    }
    catch (error) {
        console.error('Failed to decrypt Mailchimp API key:', error);
        return undefined;
    }
};
exports.default = mongoose_1.default.model('Settings', settingsSchema);
