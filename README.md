# SendStream: Automated Newsletter Platform

SendStream is a modern, full-stack SaaS platform that streamlines the process of creating, sending, and managing newsletters for individuals, creators, and businesses. Built with Next.js, React, TypeScript, and Node.js, it offers a seamless experience for both newsletter publishers and their subscribers.

## What Does SendStream Do?
- **Automates Newsletter Delivery:** Schedule, send, and track newsletters with ease. Integrates with email providers and supports automated delivery.
- **Subscription Management:** Handles user signups, logins, and secure subscription payments (Stripe integration). Centralized logic ensures a smooth renewal and access flow.
- **Analytics & Insights:** Get actionable analytics on subscriber growth, engagement, and content quality. Visual dashboards help you understand your audience and improve your content.
- **Content Quality Tracking:** Built-in metrics and charts to help you measure and improve the quality of your newsletters.
- **Seamless User Experience:** Clean, modern UI with authentication, onboarding, and renewal flows. All subscription logic is centralized for reliability and maintainability.
- **Integrations:** Easily connect with Mailchimp and other tools to sync subscribers and automate workflows.

## Who Is It For?
- Newsletter creators, writers, and businesses who want to automate and scale their email outreach.
- Anyone looking for a robust, production-ready newsletter SaaS with analytics, payment, and subscription management out of the box.

## Key Features
- Next.js 14+ app directory, React 18, TypeScript
- Centralized subscription/renewal logic (no more race conditions or duplicate redirects)
- Stripe payments and renewal flows
- Analytics dashboard for subscribers and newsletters
- Mailchimp integration
- Modern, responsive UI (Tailwind CSS)
- Secure authentication (JWT, HTTP-only cookies)
- Extensible and production-ready

## Getting Started
1. **Clone the repo:**
   ```bash
   git clone https://github.com/yourusername/sendstream.git
   cd sendstream
   ```
2. **Install dependencies:**
   ```bash
   cd backend && npm install
   cd ../client && npm install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` in both `backend` and `client` folders and fill in your keys (Stripe, Mailchimp, DB, etc).
4. **Run the app locally:**
   ```bash
   # In one terminal
   cd backend && npm run dev
   # In another terminal
   cd client && npm run dev
   ```
5. **Deploy:**
   - Ready for deployment on Render, Vercel, or your favorite cloud provider.

## Contributing
Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License
MIT
