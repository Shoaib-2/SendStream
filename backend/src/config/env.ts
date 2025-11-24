import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface EnvironmentConfig {
  // Server
  nodeEnv: string;
  port: number;
  
  // Database
  mongodbUri: string;
  
  // JWT
  jwtSecret: string;
  jwtExpiresIn: string;
  
  // Email
  emailUser: string;
  emailHost: string;
  emailPort: number;
  emailPassword: string;
  emailSecure: boolean;
  defaultSenderEmail: string;
  
  // Stripe
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePriceId: string;
  
  // Mailchimp
  mailchimpApiKey?: string;
  
  // Client
  clientUrl: string;
}

class ConfigService {
  private config: EnvironmentConfig;
  private requiredEnvVars = [
    'MONGODB_URI',
    'JWT_SECRET',
    'EMAIL_USER',
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_PASSWORD',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'CLIENT_URL'
  ];

  constructor() {
    this.validateEnvironment();
    this.config = this.loadConfig();
  }

  private validateEnvironment(): void {
    const missing: string[] = [];
    
    for (const envVar of this.requiredEnvVars) {
      if (!process.env[envVar]) {
        missing.push(envVar);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables:\n${missing.join('\n')}\n\n` +
        'Please check your .env file and ensure all required variables are set.'
      );
    }
  }

  private loadConfig(): EnvironmentConfig {
    return {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '5000', 10),
      
      mongodbUri: process.env.MONGODB_URI!,
      
      jwtSecret: process.env.JWT_SECRET!,
      jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
      
      emailUser: process.env.EMAIL_USER!,
      emailHost: process.env.EMAIL_HOST!,
      emailPort: parseInt(process.env.EMAIL_PORT || '587', 10),
      emailPassword: process.env.EMAIL_PASSWORD!,
      emailSecure: process.env.EMAIL_SECURE === 'true',
      defaultSenderEmail: process.env.DEFAULT_SENDER_EMAIL || process.env.EMAIL_USER!,
      
      stripeSecretKey: process.env.STRIPE_SECRET_KEY!,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      stripePriceId: process.env.STRIPE_PRICE_ID || '',
      
      mailchimpApiKey: process.env.MAILCHIMP_API_KEY,
      
      clientUrl: process.env.CLIENT_URL!
    };
  }

  get<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
    return this.config[key];
  }

  getAll(): EnvironmentConfig {
    return { ...this.config };
  }

  isDevelopment(): boolean {
    return this.config.nodeEnv === 'development';
  }

  isProduction(): boolean {
    return this.config.nodeEnv === 'production';
  }

  isTest(): boolean {
    return this.config.nodeEnv === 'test';
  }
}

// Export singleton instance
export const config = new ConfigService();

// Export type for use in other files
export type { EnvironmentConfig };
