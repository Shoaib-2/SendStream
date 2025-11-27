# SendStream: Complete Newsletter Automation Platform

SendStream is a comprehensive, full-stack SaaS platform that streamlines newsletter creation, distribution, and analytics for content creators, businesses, and marketing professionals. Built with Next.js 15, React 18, TypeScript, Node.js, and MongoDB, it provides an enterprise-grade solution for email marketing automation.

## 🎯 What Does SendStream Do?

### Core Features
- **AI-Powered Content Generation:** Generate engaging newsletter content with OpenAI GPT-3.5-turbo integration (NEW)
  - Smart content generation based on topics and audience
  - AI-powered subject line suggestions (5 variations)
  - Intelligent content improvement and optimization
  - Smart scheduling recommendations based on audience engagement
  - Automatic title generation from content
- **Newsletter Management:** Create, edit, schedule, and send newsletters with a rich content editor
- **Modern Table Interface:** Tab-based newsletter view (All/Sent/Draft/Scheduled) with pagination (NEW)
- **Subscriber Management:** Import subscribers via CSV, add manually, or sync with Mailchimp
- **Email Delivery:** SendGrid integration with reliable email delivery and advanced tracking
- **Scheduling System:** Schedule newsletters for future delivery with cron-based automation
- **Real-time Updates:** WebSocket integration for live subscriber status updates
- **Analytics Dashboard:** Track opens, clicks, bounces, and unsubscribes with detailed metrics
- **Content Quality Scoring:** AI-powered content analysis measuring originality, research-backed claims, and actionable insights
- **Subscription Management:** Stripe integration with 14-day free trial and automated billing
- **Mailchimp Integration:** Two-way sync with Mailchimp for subscriber management and campaign distribution
- **User Authentication:** Secure JWT-based authentication with HTTP-only cookies
- **Password Recovery:** Email-based password reset functionality
- **Settings Management:** Customizable email sender settings (from name, reply-to, sender email)

### Advanced Features
- **AI Usage Tracking:** Daily AI API quota monitoring and enforcement (NEW)
- **Modern UI/UX:** Glass morphism design with gradient animations and smooth transitions (NEW)
- **Delete Confirmation Modals:** Modern confirmation dialogs with animations (NEW)
- **Email Usage Tracking:** Daily email quota monitoring and enforcement
- **Unsubscribe Management:** One-click unsubscribe with tracking pixel integration
- **CSV Import/Export:** Bulk subscriber operations with CSV file support
- **Growth Analytics:** Visual charts showing subscriber growth over time using Nivo charts
- **Newsletter Status Tracking:** Draft, scheduled, and sent status with detailed metrics
- **Rate Limiting:** Built-in rate limiting for API endpoints and Mailchimp integration
- **Error Handling:** Comprehensive error middleware with detailed logging
- **Retry Logic:** Automatic retry mechanism for failed API calls
- **Data Validation:** Schema validation for all API inputs
- **Responsive Design:** Mobile-first design with Tailwind CSS

## 🏗️ Tech Stack

### Frontend
- **Framework:** Next.js 15.3.4 with App Router
- **UI Library:** React 18.3.0
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 3.4.1
- **Charts:** @nivo/core, @nivo/line, @nivo/pie
- **UI Components:** @headlessui/react, Lucide React icons
- **State Management:** Context API (AuthContext, DataContext, SubscriptionContext, ToastContext)
- **HTTP Client:** Axios 1.7.9
- **Payment:** @stripe/stripe-js
- **CSV Handling:** PapaParse
- **Notifications:** React Hot Toast

### Backend
- **Runtime:** Node.js with Express 4.21.2
- **Language:** TypeScript 5.7.3
- **Database:** MongoDB 6.13.0 with Mongoose 8.9.5
- **AI Integration:** OpenAI API (GPT-3.5-turbo) for content generation (NEW)
- **Authentication:** JWT (jsonwebtoken 9.0.2) with bcryptjs 2.4.3
- **Email Service:** SendGrid (@sendgrid/mail) for transactional and marketing emails
- **Payment Processing:** Stripe 17.7.0
- **Scheduling:** node-cron 3.0.3
- **Real-time:** WebSocket (ws 8.18.0)
- **Logging:** Winston 3.17.0
- **CORS:** cors 2.8.5
- **Cookie Parsing:** cookie-parser 1.4.7
- **Testing:** Jest 29.7.0, Supertest 7.0.0

### DevOps & Tools
- **Deployment:** Render (configured with render.yaml)
- **Environment:** dotenv for configuration management
- **Build Tools:** TypeScript compiler, Next.js build
- **Testing:** Jest with ts-jest and @types/jest
- **Development:** nodemon, ts-node

## 📊 Architecture Overview

### Backend Structure
```
backend/
├── src/
│   ├── config/          # Database configuration
│   ├── controllers/     # Request handlers (auth, newsletter, analytics, etc.)
│   ├── middleware/      # Auth, error handling, subscription checks
│   ├── models/          # Mongoose schemas (User, Newsletter, Subscriber, Analytics, etc.)
│   ├── routes/          # API route definitions
│   ├── services/        # Business logic (email, cron, analytics, integrations)
│   ├── utils/           # Helper functions (validation, errors, rate limiting, retry)
│   └── server.ts        # Express app initialization
└── jest.config.ts      # Jest testing configuration
```

### Frontend Structure
```
client/
├── src/
│   ├── app/            # Next.js 15 App Router pages
│   │   ├── dashboard/  # Protected dashboard pages
│   │   ├── auth/       # Authentication pages
│   │   └── api/        # API route handlers
│   ├── components/     # React components (auth, dashboard, UI)
│   ├── context/        # Context providers for global state
│   ├── services/       # API service layer
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Helper utilities
└── public/            # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- MongoDB Atlas account or local MongoDB installation
- SendGrid account with API key
- Stripe account for payment processing
- (Optional) Mailchimp account for integration

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Shoaib-2/SendStream.git
   cd SendStream
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies:**
   ```bash
   cd ../client
   npm install
   ```

### Configuration

#### Backend Environment Variables (`.env`)
Create a `.env` file in the `backend` directory:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=30d
ENCRYPTION_KEY=your_base64_encryption_key  # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
DEFAULT_SENDER_EMAIL=your_verified_sender_email
DEFAULT_SENDER_NAME=SendStream

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PRICE_ID=your_stripe_price_id
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# OpenAI (NEW)
OPENAI_API_KEY=your_openai_api_key

# URLs
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5000

# Mailchimp (Optional)
MAILCHIMP_API_KEY=your_mailchimp_api_key
```

#### Frontend Environment Variables (`.env.local`)
Create a `.env.local` file in the `client` directory:
```env
# API
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_WS_URL=ws://localhost:5000/ws
SERVER_URL=http://localhost:5000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
NEXT_PUBLIC_STRIPE_PRICE_ID=your_stripe_price_id
```

### Running the Application

#### Development Mode

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```
   Backend runs on `http://localhost:5000`

2. **Start the frontend (in a new terminal):**
   ```bash
   cd client
   npm run dev
   ```
   Frontend runs on `http://localhost:3000`

#### Production Build

1. **Build backend:**
   ```bash
   cd backend
   npm run build
   npm start
   ```

2. **Build frontend:**
   ```bash
   cd client
   npm run build
   npm start
   ```

### Testing

All API endpoints have been thoroughly tested using:
- **Jest & Supertest** - Automated unit and integration tests
- **Postman** - Manual API endpoint testing and validation

```bash
cd backend
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
```

## 📖 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/check-trial-eligibility` - Check trial eligibility
- `GET /api/auth/me` - Get current user

### Newsletter Endpoints (Protected)
- `GET /api/newsletters` - Get all newsletters
- `POST /api/newsletters` - Create newsletter
- `GET /api/newsletters/stats` - Get newsletter statistics
- `GET /api/newsletters/:id` - Get single newsletter
- `PATCH /api/newsletters/:id` - Update newsletter
- `DELETE /api/newsletters/:id` - Delete newsletter
- `POST /api/newsletters/:id/send` - Send newsletter
- `POST /api/newsletters/:id/schedule` - Schedule newsletter

### AI Endpoints (Protected) - NEW
- `POST /api/ai/generate-content` - Generate newsletter content with AI
- `POST /api/ai/improve-content` - Improve existing content with AI
- `POST /api/ai/generate-subjects` - Generate subject line suggestions
- `POST /api/ai/smart-schedule` - Get AI-powered scheduling recommendation
- `POST /api/ai/generate-title` - Generate newsletter title from content
- `GET /api/ai/usage` - Get AI usage statistics

### Subscriber Endpoints (Protected)
- `GET /api/subscribers` - Get all subscribers
- `POST /api/subscribers` - Add subscriber
- `PATCH /api/subscribers/:id` - Update subscriber
- `DELETE /api/subscribers/:id` - Delete subscriber
- `POST /api/subscribers/import` - Import from Mailchimp
- `POST /api/subscribers/bulk` - Bulk add subscribers
- `GET /api/subscribers/export` - Export to CSV

### Analytics Endpoints (Protected)
- `GET /api/analytics/summary` - Dashboard summary
- `GET /api/analytics/newsletter/:newsletterId` - Newsletter analytics
- `GET /api/analytics/growth` - Growth data
- `GET /api/analytics/activity` - Recent activity
- `GET /api/analytics/track-open/:newsletterId/:subscriberId` - Track email open (public)

### Subscription Endpoints
- `POST /api/subscription/create-trial-session` - Create Stripe trial session
- `GET /api/subscription/status` - Get subscription status (protected)
- `POST /api/subscription/cancel` - Cancel subscription (protected)
- `POST /api/subscription/update-renewal` - Update renewal settings (protected)

### Settings Endpoints (Protected)
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update user settings
- `POST /api/settings/mailchimp/test` - Test Mailchimp connection

### Health Check
- `GET /api/health` - Health check endpoint

## 🔒 Security Features

- **JWT Authentication:** Secure token-based authentication with HTTP-only cookies
- **Password Security:** 
  - bcrypt hashing with salt rounds
  - Strong password requirements (min 12 chars, uppercase, lowercase, number, special character)
  - Password reset with time-limited tokens (10 minutes)
- **Data Encryption:** AES-256-GCM encryption for sensitive data at rest (Mailchimp API keys)
- **Security Headers:** Helmet.js implementation with:
  - Content Security Policy (CSP)
  - HTTP Strict Transport Security (HSTS)
  - X-Frame-Options (clickjacking protection)
  - X-Content-Type-Options (MIME sniffing protection)
  - X-XSS-Protection
- **CORS Configuration:** Whitelist-based CORS with credentials support
- **Rate Limiting:** 
  - Custom rate limiters for all API endpoints
  - Auth routes: 5 attempts per 15 minutes with 30-minute block
  - Email routes: 10 requests per minute
  - Third-party service rate limiting compliance
- **Input Validation:** Schema validation for all user inputs
- **SQL Injection Prevention:** MongoDB parameterized queries
- **XSS Protection:** React's built-in XSS protection
- **Environment Variables:** Sensitive data stored securely
- **Subscription Middleware:** Protected routes with subscription verification
- **Database Security:**
  - Connection pooling with limits
  - Indexed queries for performance
  - Query monitoring and optimization

## 📈 Analytics & Tracking

### Tracked Metrics
- **Email Opens:** Tracking pixel implementation
- **Click Tracking:** Link click monitoring
- **Bounce Tracking:** Failed delivery tracking
- **Unsubscribe Tracking:** Unsubscribe event monitoring
- **Subscriber Growth:** Time-based growth analytics
- **Content Quality Score:** Multi-factor quality assessment

### Content Quality Scoring System
Newsletters are scored based on:
- Content length (up to 25 points)
- Original content (25 points)
- Research-backed claims with sources (up to 25 points)
- Actionable insights and key takeaways (up to 25 points)
- **Total possible score:** 100 points

## 💳 Subscription & Billing

- **Payment Processor:** Stripe
- **Free Trial:** 14 days
- **Billing Cycle:** Monthly subscription
- **Features:**
  - Automatic trial-to-paid conversion
  - Subscription status tracking (active, trialing, past_due, canceled, unpaid)
  - Cancel anytime with period-end cancellation
  - Auto-renewal management
  - Trial eligibility tracking (one trial per user)
  - Webhook integration for subscription events

## 📧 Email Delivery

### SendGrid Configuration
- **Service:** SendGrid Email API
- **Security:** API key authentication with HTTPS
- **Reliability:** 99.9% uptime SLA with advanced deliverability
- **Tracking:** Email usage monitoring, delivery stats, and quota enforcement
- **Features:**
  - Custom sender name and reply-to
  - HTML email templates
  - Advanced tracking (opens, clicks, bounces)
  - Unsubscribe link automation
  - Batch processing with high throughput
  - Email validation and spam protection

### Email Templates
- Professional HTML email design
- Mobile-responsive layout
- Tracking pixel for open rate monitoring
- One-click unsubscribe link
- Custom branding support

## 🔗 Third-Party Integrations

### Mailchimp Integration
- **Two-way sync:** Sync subscribers between platform and Mailchimp
- **Features:**
  - Automatic list synchronization
  - Campaign creation and sending
  - Subscriber status updates
  - Bulk operations support
  - Connection testing
  - Rate limiting compliance

### Stripe Integration
- **Checkout sessions:** Hosted checkout with trial support
- **Subscription management:** Full lifecycle management
- **Webhooks:** Real-time subscription event handling
- **Customer portal:** Subscription management UI

## 🌐 Deployment

### Render Deployment (Configured)
The project includes `render.yaml` configuration for automated deployment:

**Backend Service:**
- Build: `npm install && npm run build`
- Start: `npm start`
- Health check: `/api/health`
- Auto-deploy enabled

**Frontend Service:**
- Build: Next.js production build
- Start: `npm start` on port 3000
- Environment variables configured

### Manual Deployment Options
- **Vercel:** Optimal for Next.js frontend
- **Render:** Backend and frontend


### Environment Setup for Production
1. Set all required environment variables
2. Configure MongoDB Atlas with IP whitelist
3. Set up Stripe webhook endpoint
4. Configure SendGrid with verified sender domain
5. Update CORS origins for production URLs
6. Enable SSL/TLS certificates

## 🧪 Testing Strategy

### Test Coverage
All API endpoints and features have been comprehensively tested using:
- **Jest & Supertest:** Automated unit and integration tests for backend services
- **Postman:** Manual API testing for all endpoints with various scenarios

### Test Areas
- **Unit Tests:** Individual functions and utilities
- **Integration Tests:** API endpoints and services
- **Authentication Tests:** Login, registration, password reset
- **Newsletter Tests:** CRUD operations and scheduling
- **Subscriber Tests:** Import, export, sync operations
- **Email Tests:** Delivery, tracking, templates
- **Mailchimp Tests:** API integration and sync
- **AI Tests:** Content generation, improvement, and scheduling endpoints


## 📝 Key Models & Schemas

### User Model
- Email, password (hashed), role
- Stripe customer ID, subscription ID
- Subscription status, trial dates
- Trial usage tracking
- Password reset tokens

### Newsletter Model
- Title, subject, content
- Status (draft, scheduled, sent)
- Scheduling and sent dates
- Content quality metrics
- User association

### Subscriber Model
- Email, name, status
- Subscription date, unsubscribe date
- Source tracking (CSV, Mailchimp, manual)
- User association
- Unique email per user constraint

### Analytics Model
- Newsletter reference
- Opens, clicks, bounces, unsubscribes
- Detailed event tracking with timestamps
- Subscriber-level details

### Settings Model
- Email configuration (from name, reply-to, sender)
- Mailchimp API credentials
- Auto-sync preferences

### EmailUsage Model
- Daily usage tracking per user
- Email count and limits
- Last updated timestamp

## 🛠️ Development Tools

### Available Scripts

**Backend:**
- `npm run dev` - Start development server with nodemon
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run production server
- `npm test` - Run test suite

**Frontend:**
- `npm run dev` - Start Next.js development server
- `npm run build` - Create production build
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style
- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Write tests for new features
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- **Shoaib-2** - [GitHub Profile](https://github.com/Shoaib-2)

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Stripe for payment processing
- Mailchimp for email marketing integration
- MongoDB for database solutions
- All open-source contributors

## 📞 Support

For support, open an issue in the GitHub repository.

## 🔄 Version History

- **1.2.0** (Current - November 2025)
  - **AI Integration:**
    - OpenAI GPT-3.5-turbo integration for content generation
    - AI-powered subject line suggestions (5 variations)
    - Intelligent content improvement and optimization
    - Smart scheduling recommendations
    - Automatic title generation from content
    - AI usage tracking and quota management (50 requests/day per user)
  - **UI/UX Improvements:**
    - Modern table view for newsletters with tabs (All/Sent/Draft/Scheduled)
    - Pagination support (10 items per page)
    - Glass morphism design system throughout the app
    - Shimmer loading animations on AI buttons
    - Delete confirmation modals with animations
    - AI feature highlights on landing page
    - Custom SendStream favicon with gradient design
  - **Performance Optimizations:**
    - Removed 102+ console.log statements from production build
    - Optimized AI response times (8-12 seconds average)
    - Reduced token usage by 30-40% for faster responses
    - 30-second timeout on AI requests for reliability
  - **Bug Fixes:**
    - Fixed timezone display in newsletter scheduler (now shows local time)
    - Fixed authentication middleware for AI endpoints
    - Resolved button layout issues in newsletter creation
    - Fixed linting errors across all client-side code

- **1.1.0** (December 2024)
  - **Security Enhancements:**
    - Added Helmet.js security headers (CSP, HSTS, XSS protection)
    - Implemented AES-256-GCM encryption for API keys at rest
    - Strengthened password requirements (12+ chars with complexity rules)
    - Added comprehensive CORS configuration
    - Fixed all npm audit vulnerabilities (7 backend, 6 frontend)
  - **Performance Improvements:**
    - Database connection pooling (10 max, 2 min)
    - Comprehensive database indexing for all collections
    - In-memory caching with TTL (5-30 min depending on data type)
    - Query optimization with .lean() for read-only operations
    - Dynamic imports for heavy frontend components
  - **Architecture Improvements:**
    - Repository pattern for data access layer
    - Service layer separation of concerns
    - Rate limiting middleware for all API routes
    - Enhanced error handling and logging

- **1.0.0**
  - Initial release with full feature set
  - Newsletter creation and management
  - Subscriber management with CSV import/export
  - Mailchimp integration
  - Stripe subscription with 14-day trial
  - Analytics dashboard
  - Content quality scoring
  - Email scheduling with cron
  - Real-time WebSocket updates
