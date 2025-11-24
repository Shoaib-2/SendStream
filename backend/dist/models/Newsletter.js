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
const newsletterSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    subject: { type: String, required: true },
    content: { type: String, required: true },
    status: { type: String, enum: ['draft', 'scheduled', 'sent'], default: 'draft' },
    sentTo: { type: Number, default: 0 },
    scheduledDate: Date,
    sentDate: Date,
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    contentQuality: {
        isOriginalContent: { type: Boolean, default: false },
        hasResearchBacked: { type: Boolean, default: false },
        hasActionableInsights: { type: Boolean, default: false },
        contentLength: { type: Number, default: 0 },
        sources: [String],
        keyTakeaways: [String],
        qualityScore: { type: Number, default: 0 }
    }
}, { timestamps: true });
newsletterSchema.methods.calculateQualityScore = function () {
    let score = 0;
    const quality = this.contentQuality;
    if (quality) {
        score += Math.min(quality.contentLength / 200, 25);
        if (quality.isOriginalContent)
            score += 25;
        if (quality.hasResearchBacked && quality.sources.length > 0) {
            score += 15 + Math.min(quality.sources.length * 2, 10);
        }
        if (quality.hasActionableInsights && quality.keyTakeaways.length > 0) {
            score += 15 + Math.min(quality.keyTakeaways.length * 2, 10);
        }
        this.contentQuality.qualityScore = Math.round(score);
    }
    return score;
};
newsletterSchema.pre('save', function (next) {
    if (this.isModified('content')) {
        this.contentQuality.contentLength = this.content.length;
    }
    this.calculateQualityScore();
    next();
});
exports.default = mongoose_1.default.model('Newsletter', newsletterSchema);
