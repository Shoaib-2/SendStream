"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastSubscriberUpdate = exports.wss = void 0;
// server.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const cookie_parser_1 = __importDefault(require("cookie-parser")); // Add cookie-parser
const error_middleware_1 = require("./middleware/error.middleware");
const cors_config_1 = require("./config/cors.config");
const helmet_config_1 = require("./config/helmet.config");
const newsletter_routes_1 = __importDefault(require("./routes/newsletter.routes"));
const subscribers_route_1 = __importDefault(require("./routes/subscribers.route"));
const ws_1 = require("ws");
const http_1 = require("http");
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const health_routes_1 = __importDefault(require("./routes/health.routes"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
const auth_middleware_1 = require("./middleware/auth/auth.middleware");
const susbcription_middleware_1 = require("./middleware/susbcription.middleware");
const email_routes_1 = __importDefault(require("./routes/email.routes"));
const mongoose_1 = __importDefault(require("mongoose"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Security middleware - must be early in the middleware chain
app.use((0, helmet_1.default)(helmet_config_1.helmetConfig));
// CORS configuration
app.use((0, cors_1.default)(cors_config_1.corsConfig));
// Add body parsing middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
const server = (0, http_1.createServer)(app);
const wss = new ws_1.WebSocketServer({ server });
exports.wss = wss;
wss.on('connection', (ws, req) => {
    try {
        // Verify JWT token from query params
        const token = req.url?.split('token=')[1];
        if (!token) {
            ws.close(1008, 'Authentication required');
            return;
        }
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err) => {
            if (err) {
                ws.close(1008, 'Invalid token');
                return;
            }
            // Send connection confirmation
            ws.send(JSON.stringify({ type: 'connection_established' }));
        });
    }
    catch (error) {
        console.error('WebSocket connection error:', error);
    }
});
// Broadcast function to notify all connected clients
const broadcastSubscriberUpdate = (subscriberId, status) => {
    const message = JSON.stringify({
        type: 'subscriber_update',
        data: {
            id: subscriberId,
            status
        }
    });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
};
exports.broadcastSubscriberUpdate = broadcastSubscriberUpdate;
// Apply CORS config for WebSocket as well
// Apply CORS verification to WebSocket upgrade requests
wss.on('headers', (headers) => {
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://client-3ye4.onrender.com',
        'https://backend-9h3q.onrender.com'
    ];
    const origin = headers.find(h => h.toLowerCase().startsWith('origin:'))?.split(': ')[1];
    if (origin && allowedOrigins.includes(origin)) {
        headers.push('Access-Control-Allow-Origin: ' + origin);
        headers.push('Access-Control-Allow-Credentials: true');
        headers.push('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, PATCH, OPTIONS');
        headers.push('Access-Control-Allow-Headers: Content-Type, Authorization, Cookie, X-XSRF-TOKEN');
        headers.push('Access-Control-Expose-Headers: Set-Cookie, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
    }
});
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)()); // Added cookie-parser middleware
// Add non-protected routes first
app.use('/api/auth', auth_routes_1.default);
app.use('/api/health', health_routes_1.default);
app.use('/api/subscription', subscription_routes_1.default); // Add subscription routes before protection
// Apply protection middleware to all other routes
const protectedRouter = express_1.default.Router();
protectedRouter.use(auth_middleware_1.protect);
protectedRouter.use(susbcription_middleware_1.checkSubscription);
// Add protected routes
protectedRouter.use('/newsletters', newsletter_routes_1.default);
protectedRouter.use('/subscribers', subscribers_route_1.default);
protectedRouter.use('/analytics', analytics_routes_1.default);
protectedRouter.use('/settings', settings_routes_1.default);
protectedRouter.use('/email', email_routes_1.default);
// Mount the protected router under /api
app.use('/api', protectedRouter);
app.use((req, res) => {
    console.log(`404 - Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`
    });
});
app.use((err, req, res, next) => {
    (0, error_middleware_1.errorHandler)(err, req, res, next);
});
const PORT = process.env.PORT || 5000;
// Initialize database connection before starting server
(0, database_1.connectDB)().then(() => {
    server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log('WebSocket server initialized on port', PORT);
        console.log('Available routes:');
        console.log(' - /api/auth');
        console.log(' - /api/subscribers');
        console.log(' - /api/newsletters');
        console.log(' - /api/subscription');
    });
}).catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
});
mongoose_1.default.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});
mongoose_1.default.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
});
