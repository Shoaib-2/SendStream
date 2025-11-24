"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/models/EmailUsage.ts
const mongoose_1 = __importDefault(require("mongoose"));
const emailUsageSchema = new mongoose_1.default.Schema({
    userId: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    emailsSent: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
});
// Create a compound index for efficient lookups
emailUsageSchema.index({ userId: 1, date: 1 }, { unique: true });
// Create and export the model
const EmailUsageModel = mongoose_1.default.models.EmailUsage || mongoose_1.default.model('EmailUsage', emailUsageSchema);
exports.default = EmailUsageModel;
