/**
 * Repository Layer Index
 * Central export point for all data access repositories
 */

export { UserRepository, userRepository } from './UserRepository';
export { NewsletterRepository, newsletterRepository } from './NewsletterRepository';
export { SubscriberRepository, subscriberRepository } from './SubscriberRepository';
export { SettingsRepository, settingsRepository } from './SettingsRepository';
export { AnalyticsRepository, analyticsRepository } from './AnalyticsRepository';

// Export all repository instances as a single object for convenience
export const repositories = {
  user: require('./UserRepository').userRepository,
  newsletter: require('./NewsletterRepository').newsletterRepository,
  subscriber: require('./SubscriberRepository').subscriberRepository,
  settings: require('./SettingsRepository').settingsRepository,
  analytics: require('./AnalyticsRepository').analyticsRepository
};
