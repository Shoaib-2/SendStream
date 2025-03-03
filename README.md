# Newsletter Automation System

A full-stack newsletter management system built with Node.js/Express (Backend) and Next.js (Frontend) that allows users to create, manage, and send newsletters while tracking engagement metrics.

## Features

### Email Management
- 📧 Create and send newsletters to subscriber lists
- 📊 Track email opens and engagement
- 🔄 Customizable email templates
- 📝 Rich text editor for newsletter content
- 🎨 Responsive email designs

### Subscriber Management
- 👥 Manage subscriber lists
- 📈 Import/Export subscriber data
- 🔍 Filter and segment subscribers
- 🔄 Automatic unsubscribe handling
- ✅ Active/Inactive subscriber status tracking

### Analytics & Tracking
- 📊 Email open rates tracking
- 📈 Subscriber engagement metrics
- 📉 Unsubscribe rate monitoring
- 🔍 Detailed analytics dashboard
- 📆 Historical data tracking

### Integrations
- 🔄 Mailchimp integration
- 📧 SMTP email provider support
- 🔌 Extensible integration system

### Security & Performance
- 🔒 Secure authentication system
- 🚀 Rate limiting for API endpoints
- 📝 Comprehensive logging system
- 🔄 Error handling and recovery
- 🛡️ Input validation and sanitization

## Tech Stack

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose
- **Email Service**: Nodemailer
- **Authentication**: JWT
- **Testing**: Jest
- **Logging**: Winston

### Frontend
- **Framework**: Next.js 13+ with App Router
- **Styling**: Tailwind CSS
- **State Management**: React Context
- **Form Handling**: Custom validation
- **UI Components**: Custom components with modern design

## Project Structure

### Backend Structure
\`\`\`
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── middleware/     # Custom middleware
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── services/      # Business logic
│   ├── types/         # TypeScript types
│   └── utils/         # Utility functions
├── tests/             # Test files
└── logs/              # Application logs
\`\`\`

### Frontend Structure
\`\`\`
client/
├── src/
│   ├── app/          # Next.js 13+ app directory
│   ├── components/   # React components
│   ├── context/      # React context providers
│   ├── services/     # API services
│   ├── types/        # TypeScript types
│   └── utils/        # Utility functions
└── public/           # Static files
\`\`\`

## Setup & Installation

### Prerequisites
- Node.js 16+
- MongoDB
- SMTP email provider credentials
- (Optional) Mailchimp API credentials

### Backend Setup
1. Navigate to the backend directory:
   \`\`\`bash
   cd backend
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Create a .env file with the following variables:
   \`\`\`
   PORT=3001
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   EMAIL_USER=your_email
   EMAIL_PASSWORD=your_email_password
   SERVER_URL=http://localhost:3001
   \`\`\`

4. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

### Frontend Setup
1. Navigate to the client directory:
   \`\`\`bash
   cd client
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Create a .env file with:
   \`\`\`
   NEXT_PUBLIC_API_URL=http://localhost:3001
   \`\`\`

4. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

## API Documentation

### Authentication Endpoints
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - User logout

### Newsletter Endpoints
- GET `/api/newsletters` - List all newsletters
- POST `/api/newsletters` - Create newsletter
- GET `/api/newsletters/:id` - Get newsletter details
- PUT `/api/newsletters/:id` - Update newsletter
- DELETE `/api/newsletters/:id` - Delete newsletter
- POST `/api/email/send/:newsletterId` - Send newsletter

### Subscriber Endpoints
- GET `/api/subscribers` - List subscribers
- POST `/api/subscribers` - Add subscriber
- PUT `/api/subscribers/:id` - Update subscriber
- DELETE `/api/subscribers/:id` - Remove subscriber
- GET `/api/subscribers/unsubscribe/:token` - Unsubscribe handling

### Analytics Endpoints
- GET `/api/analytics/newsletter/:id` - Get newsletter analytics
- GET `/api/analytics/track-open/:newsletterId/:subscriberId` - Track email opens

## Testing

### Backend Tests
Run the test suite:
\`\`\`bash
cd backend
npm test
\`\`\`

### Frontend Tests
Run the test suite:
\`\`\`bash
cd client
npm test
\`\`\`

## Contributing

1. Fork the repository
2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)
3. Commit your changes (\`git commit -m 'Add some AmazingFeature'\`)
4. Push to the branch (\`git push origin feature/AmazingFeature\`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@newsletter-automation.com or open an issue in the repository.
