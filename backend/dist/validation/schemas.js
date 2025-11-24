"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = exports.emailSchema = exports.mongoIdSchema = exports.cancelSubscriptionSchema = exports.createCheckoutSessionSchema = exports.enableIntegrationSchema = exports.updateSettingsSchema = exports.importSubscribersSchema = exports.bulkDeleteSubscribersSchema = exports.updateSubscriberSchema = exports.createSubscriberSchema = exports.scheduleNewsletterSchema = exports.updateNewsletterSchema = exports.createNewsletterSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// Auth validation schemas
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format'),
        password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
        stripeSessionId: zod_1.z.string().optional()
    })
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format'),
        password: zod_1.z.string().min(1, 'Password is required')
    })
});
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format')
    })
});
exports.resetPasswordSchema = zod_1.z.object({
    params: zod_1.z.object({
        token: zod_1.z.string().min(1, 'Token is required')
    }),
    body: zod_1.z.object({
        password: zod_1.z.string().min(8, 'Password must be at least 8 characters')
    })
});
// Newsletter validation schemas
exports.createNewsletterSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(1, 'Title is required').max(200, 'Title too long'),
        subject: zod_1.z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
        content: zod_1.z.string().min(1, 'Content is required'),
        status: zod_1.z.enum(['draft', 'scheduled', 'sent']).optional(),
        scheduledDate: zod_1.z.string().datetime().optional()
    })
});
exports.updateNewsletterSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid newsletter ID')
    }),
    body: zod_1.z.object({
        title: zod_1.z.string().min(1).max(200).optional(),
        subject: zod_1.z.string().min(1).max(200).optional(),
        content: zod_1.z.string().min(1).optional(),
        status: zod_1.z.enum(['draft', 'scheduled', 'sent']).optional(),
        scheduledDate: zod_1.z.string().datetime().optional()
    })
});
exports.scheduleNewsletterSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid newsletter ID')
    }),
    body: zod_1.z.object({
        scheduledDate: zod_1.z.string().refine((date) => {
            const scheduleTime = new Date(parseInt(date));
            const now = new Date();
            return scheduleTime.getTime() > now.getTime() + 30000;
        }, { message: 'Scheduled date must be at least 30 seconds in the future' })
    })
});
// Subscriber validation schemas
exports.createSubscriberSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format'),
        name: zod_1.z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
        status: zod_1.z.enum(['active', 'unsubscribed']).optional()
    })
});
exports.updateSubscriberSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid subscriber ID')
    }),
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format').optional(),
        name: zod_1.z.string().min(1).max(100).optional(),
        status: zod_1.z.enum(['active', 'unsubscribed']).optional()
    })
});
exports.bulkDeleteSubscribersSchema = zod_1.z.object({
    body: zod_1.z.object({
        ids: zod_1.z.array(zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1, 'At least one ID required')
    })
});
exports.importSubscribersSchema = zod_1.z.object({
    body: zod_1.z.object({
        csvData: zod_1.z.string().min(1, 'CSV data is required')
    })
});
// Settings validation schemas
exports.updateSettingsSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.object({
            fromName: zod_1.z.string().min(1).max(100).optional(),
            replyTo: zod_1.z.string().email().optional(),
            senderEmail: zod_1.z.string().email().optional()
        }).optional(),
        mailchimp: zod_1.z.object({
            apiKey: zod_1.z.string().optional(),
            serverPrefix: zod_1.z.string().optional(),
            listId: zod_1.z.string().optional(),
            enabled: zod_1.z.boolean().optional(),
            autoSync: zod_1.z.boolean().optional()
        }).optional()
    })
});
exports.enableIntegrationSchema = zod_1.z.object({
    params: zod_1.z.object({
        type: zod_1.z.enum(['mailchimp'])
    }),
    body: zod_1.z.object({
        enabled: zod_1.z.boolean(),
        autoSync: zod_1.z.boolean().optional()
    })
});
// Stripe validation schemas
exports.createCheckoutSessionSchema = zod_1.z.object({
    body: zod_1.z.object({
        priceId: zod_1.z.string().min(1, 'Price ID is required'),
        successUrl: zod_1.z.string().url().optional(),
        cancelUrl: zod_1.z.string().url().optional()
    })
});
exports.cancelSubscriptionSchema = zod_1.z.object({
    body: zod_1.z.object({
        subscriptionId: zod_1.z.string().min(1, 'Subscription ID is required')
    })
});
// MongoDB ObjectId validation
exports.mongoIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format')
    })
});
// Email validation
exports.emailSchema = zod_1.z.string().email();
// Common query schemas
exports.paginationSchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        limit: zod_1.z.string().regex(/^\d+$/).transform(Number).optional(),
        sort: zod_1.z.string().optional(),
        order: zod_1.z.enum(['asc', 'desc']).optional()
    })
});
