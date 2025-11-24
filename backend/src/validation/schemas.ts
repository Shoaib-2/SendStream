import { z } from 'zod';

// Auth validation schemas
export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    stripeSessionId: z.string().optional()
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format')
  })
});

export const resetPasswordSchema = z.object({
  params: z.object({
    token: z.string().min(1, 'Token is required')
  }),
  body: z.object({
    password: z.string().min(8, 'Password must be at least 8 characters')
  })
});

// Newsletter validation schemas
export const createNewsletterSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
    content: z.string().min(1, 'Content is required'),
    status: z.enum(['draft', 'scheduled', 'sent']).optional(),
    scheduledDate: z.string().datetime().optional()
  })
});

export const updateNewsletterSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid newsletter ID')
  }),
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    subject: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    status: z.enum(['draft', 'scheduled', 'sent']).optional(),
    scheduledDate: z.string().datetime().optional()
  })
});

export const scheduleNewsletterSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid newsletter ID')
  }),
  body: z.object({
    scheduledDate: z.string().refine(
      (date) => {
        const scheduleTime = new Date(parseInt(date));
        const now = new Date();
        return scheduleTime.getTime() > now.getTime() + 30000;
      },
      { message: 'Scheduled date must be at least 30 seconds in the future' }
    )
  })
});

// Subscriber validation schemas
export const createSubscriberSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
    status: z.enum(['active', 'unsubscribed']).optional()
  })
});

export const updateSubscriberSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid subscriber ID')
  }),
  body: z.object({
    email: z.string().email('Invalid email format').optional(),
    name: z.string().min(1).max(100).optional(),
    status: z.enum(['active', 'unsubscribed']).optional()
  })
});

export const bulkDeleteSubscribersSchema = z.object({
  body: z.object({
    ids: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).min(1, 'At least one ID required')
  })
});

export const importSubscribersSchema = z.object({
  body: z.object({
    csvData: z.string().min(1, 'CSV data is required')
  })
});

// Settings validation schemas
export const updateSettingsSchema = z.object({
  body: z.object({
    email: z.object({
      fromName: z.string().min(1).max(100).optional(),
      replyTo: z.string().email().optional(),
      senderEmail: z.string().email().optional()
    }).optional(),
    mailchimp: z.object({
      apiKey: z.string().optional(),
      serverPrefix: z.string().optional(),
      listId: z.string().optional(),
      enabled: z.boolean().optional(),
      autoSync: z.boolean().optional()
    }).optional()
  })
});

export const enableIntegrationSchema = z.object({
  params: z.object({
    type: z.enum(['mailchimp'])
  }),
  body: z.object({
    enabled: z.boolean(),
    autoSync: z.boolean().optional()
  })
});

// Stripe validation schemas
export const createCheckoutSessionSchema = z.object({
  body: z.object({
    priceId: z.string().min(1, 'Price ID is required'),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional()
  })
});

export const cancelSubscriptionSchema = z.object({
  body: z.object({
    subscriptionId: z.string().min(1, 'Subscription ID is required')
  })
});

// MongoDB ObjectId validation
export const mongoIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format')
  })
});

// Email validation
export const emailSchema = z.string().email();

// Common query schemas
export const paginationSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).transform(Number).optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional()
  })
});

// Type exports for use in controllers
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateNewsletterInput = z.infer<typeof createNewsletterSchema>;
export type UpdateNewsletterInput = z.infer<typeof updateNewsletterSchema>;
export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>;
export type UpdateSubscriberInput = z.infer<typeof updateSubscriberSchema>;
