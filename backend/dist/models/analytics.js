"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/models/Analytics.ts
const mongoose_1 = __importDefault(require("mongoose"));
const analyticsSchema = new mongoose_1.default.Schema({
    newsletterId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'Newsletter',
        required: true
    },
    createdBy: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    opens: {
        count: { type: Number, default: 0 },
        details: [{
                subscriberId: {
                    type: mongoose_1.default.Schema.Types.ObjectId,
                    ref: 'Subscriber'
                },
                timestamp: { type: Date, default: Date.now }
            }]
    },
    clicks: {
        count: { type: Number, default: 0 },
        details: [{
                subscriberId: {
                    type: mongoose_1.default.Schema.Types.ObjectId,
                    ref: 'Subscriber'
                },
                url: String,
                timestamp: { type: Date, default: Date.now }
            }]
    },
    bounces: {
        count: { type: Number, default: 0 },
        details: [{
                subscriberId: {
                    type: mongoose_1.default.Schema.Types.ObjectId,
                    ref: 'Subscriber'
                },
                reason: String,
                timestamp: { type: Date, default: Date.now }
            }]
    },
    unsubscribes: {
        count: { type: Number, default: 0 },
        details: [{
                subscriberId: {
                    type: mongoose_1.default.Schema.Types.ObjectId,
                    ref: 'Subscriber'
                },
                reason: String,
                timestamp: { type: Date, default: Date.now }
            }]
    }
}, {
    timestamps: true
});
exports.default = mongoose_1.default.model('Analytics', analyticsSchema);
