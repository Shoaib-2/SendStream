"use strict";
/**
 * Repository Layer Index
 * Central export point for all data access repositories
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.repositories = exports.analyticsRepository = exports.AnalyticsRepository = exports.settingsRepository = exports.SettingsRepository = exports.subscriberRepository = exports.SubscriberRepository = exports.newsletterRepository = exports.NewsletterRepository = exports.userRepository = exports.UserRepository = void 0;
var UserRepository_1 = require("./UserRepository");
Object.defineProperty(exports, "UserRepository", { enumerable: true, get: function () { return UserRepository_1.UserRepository; } });
Object.defineProperty(exports, "userRepository", { enumerable: true, get: function () { return UserRepository_1.userRepository; } });
var NewsletterRepository_1 = require("./NewsletterRepository");
Object.defineProperty(exports, "NewsletterRepository", { enumerable: true, get: function () { return NewsletterRepository_1.NewsletterRepository; } });
Object.defineProperty(exports, "newsletterRepository", { enumerable: true, get: function () { return NewsletterRepository_1.newsletterRepository; } });
var SubscriberRepository_1 = require("./SubscriberRepository");
Object.defineProperty(exports, "SubscriberRepository", { enumerable: true, get: function () { return SubscriberRepository_1.SubscriberRepository; } });
Object.defineProperty(exports, "subscriberRepository", { enumerable: true, get: function () { return SubscriberRepository_1.subscriberRepository; } });
var SettingsRepository_1 = require("./SettingsRepository");
Object.defineProperty(exports, "SettingsRepository", { enumerable: true, get: function () { return SettingsRepository_1.SettingsRepository; } });
Object.defineProperty(exports, "settingsRepository", { enumerable: true, get: function () { return SettingsRepository_1.settingsRepository; } });
var AnalyticsRepository_1 = require("./AnalyticsRepository");
Object.defineProperty(exports, "AnalyticsRepository", { enumerable: true, get: function () { return AnalyticsRepository_1.AnalyticsRepository; } });
Object.defineProperty(exports, "analyticsRepository", { enumerable: true, get: function () { return AnalyticsRepository_1.analyticsRepository; } });
// Export all repository instances as a single object for convenience
exports.repositories = {
    user: require('./UserRepository').userRepository,
    newsletter: require('./NewsletterRepository').newsletterRepository,
    subscriber: require('./SubscriberRepository').subscriberRepository,
    settings: require('./SettingsRepository').settingsRepository,
    analytics: require('./AnalyticsRepository').analyticsRepository
};
