"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTestToken = generateTestToken;
// backend/utils/test-helpers.ts
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.test' });
function generateTestToken() {
    const payload = { userId: 'test_user_id', email: 'test@example.com' };
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, { expiresIn: '48h' });
}
