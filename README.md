# Newsletter Automation

## Description
SendStream is a powerful application designed to streamline the process of sending newsletters to subscribers. It integrates with popular email services like Mailchimp and Substack, allowing users to manage their own email campaigns effectively.

## Features
- **Mailchimp Integration**: Seamlessly connect to Mailchimp to manage subscribers and send newsletters.
- **Gmail Service**: Send newsletters directly using Gmail for smaller-scale campaigns.
- **User Management**: Allow users to manage their own Mailchimp and Substack accounts for personalized email campaigns.

## Technologies Used
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, Next.js, Tailwind CSS
- **Database**: MongoDB 
- **Email Services**: Nodemailer, Mailchimp API, Substack API

## Installation
To set up the project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/newsletter-automation.git
   cd newsletter-automation
   ```

2. Install dependencies for the backend:
   ```bash
   cd backend
   npm install
   ```

3. Install dependencies for the client:
   ```bash
   cd client
   npm install
   ```

4. Create a `.env` file in the backend directory and add your environment variables:
   ```plaintext
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASSWORD=your_email_password
   MAILCHIMP_API_KEY=your_mailchimp_api_key
   MAILCHIMP_SERVER_PREFIX=your_mailchimp_server_prefix
   ```

## Usage
To start the application, run the following commands in separate terminal windows:

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend application:
   ```bash
   cd client
   npm run dev
   ```

Visit `http://localhost:3000` to access the application.

## API Integrations
### Mailchimp
To integrate with Mailchimp, ensure you have your API key and server prefix set in the `.env` file. The application will handle subscriber management and newsletter sending through the Mailchimp API.


## Contributing
Contributions are welcome! Please follow these steps to contribute:
1. Fork the repository.
2. Create a new branch (`git checkout -b feature/YourFeature`).
3. Make your changes and commit them (`git commit -m 'Add some feature'`).
4. Push to the branch (`git push origin feature/YourFeature`).
5. Open a pull request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
