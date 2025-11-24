"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/models/User.ts
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const userSchema = new mongoose_1.default.Schema({
    stripeCustomerId: {
        type: String,
        default: null
    },
    stripeSubscriptionId: {
        type: String,
        default: null
    },
    subscriptionStatus: {
        type: String,
        enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid', null],
        default: null
    },
    trialEndsAt: {
        type: Date,
        default: null
    },
    trialUsed: {
        type: Boolean,
        default: false
    },
    subscribed: {
        type: Date,
        default: () => new Date()
    },
    cancelAtPeriodEndPreference: {
        type: Boolean,
        default: false
    },
    hasActiveAccess: {
        type: Boolean,
        default: false
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8,
        select: false
    },
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    passwordResetToken: String,
    passwordResetExpires: Date
}, {
    timestamps: true,
    _id: true
});
// Define comparePassword method
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        if (!this.password) {
            const userModel = mongoose_1.default.model('User');
            const user = await userModel.findById(this._id).select('+password');
            if (!user)
                return false;
            return bcryptjs_1.default.compare(candidatePassword, user.password);
        }
        return bcryptjs_1.default.compare(candidatePassword, this.password);
    }
    catch (error) {
        console.error('Password comparison error:', error);
        return false;
    }
};
// Define generateToken method
userSchema.methods.generateToken = function () {
    return jsonwebtoken_1.default.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' } // Increased expiration time
    );
};
// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcryptjs_1.default.genSalt(10);
        if (this.password) {
            const hashedPassword = await bcryptjs_1.default.hash(this.password, salt);
            this.password = hashedPassword;
        }
        next();
    }
    catch (error) {
        next(error);
    }
});
const User = mongoose_1.default.model('User', userSchema);
exports.default = User;
