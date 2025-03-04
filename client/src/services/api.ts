
import axios, { AxiosError, AxiosRequestConfig  } from 'axios';

// Added request queue for performance optimization with large datasets
const pendingRequests = new Map();


interface ResponseData<T> {
 status: 'success' | 'error';
 data: T;
 message?: string;
 pagination?: {
   page: number;
   limit: number;
   total: number;
   pages: number;
 };
}

interface Newsletter {
  id: string;
  _id?: string;
  createdBy: string;
  title: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  scheduledDate?: string;
  sentDate?: string;
  contentQuality?: {
    isOriginalContent: boolean;
    hasResearchBacked: boolean;
    hasActionableInsights: boolean;
    contentLength: number;
    sources: string[];
    keyTakeaways: string[];
    qualityScore: number;
  };
}

interface Subscriber {
 id: string;
 _id?: string;  
 email: string;
 name: string;
 status: 'active' | 'unsubscribed';
 subscribedDate: string;
 subscribed: string;
 source?: 'mailchimp' | 'csv' | 'manual';
}

interface NewsletterStats {
 bounces: number;
 unsubscribes: number;
}

interface GrowthData {
 date: string;
 subscribers: number;
}

interface EngagementMetrics {
 bounceRate: number;
 unsubscribeRate: number;
}

interface NewsletterWithStats extends Omit<Newsletter, 'opens'> {
  opens: number;
  sent: number;
}

interface ExtendedIntegrationResponse {
  success: boolean;
  message: string;
  listId?: string;
}

interface NewsletterResponse {
  newsletters: Newsletter[];
  qualityStats: {
    averageScore: number;
    qualityDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    topPerformers: Newsletter[];
  };
}

interface Settings {
  email: {
    fromName: string;
    replyTo: string;
    senderEmail?: string;
  };
  mailchimp: {
    apiKey: string;
    serverPrefix: string;
    enabled: boolean;
    autoSync: boolean;
    listId?: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
console.log('API URL:', API_URL); // Debug log

export class APIError extends Error {
 constructor(
   public status: number,
   message: string,
   public data?: any
 ) {
   super(message);
   this.name = 'APIError';
 }
}

// Improved error handling for database scaling
const handleError = (error: AxiosError) => {
  if (error.response) {
    const statusCode = error.response.status;
    const responseData = error.response.data as ResponseData<any>;
    
    // Handle specific database errors
    if (statusCode === 429) {
      throw new APIError(
        429,
        'Rate limit exceeded. Please try again later.',
        responseData
      );
    }

    if (statusCode === 503) {
      throw new APIError(
        503,
        'Database currently unavailable. Please try again later.',
        responseData
      );
    }

    throw new APIError(
      statusCode,
      responseData.message || `Request failed with status ${statusCode}`,
      responseData
    );
  }
  
  if (error.message === 'Network Error') {
    throw new APIError(503, 'Service unavailable: Cannot connect to server');
  }
  
  throw new APIError(500, error.message || 'An unexpected error occurred');
};

// Request deduplication function for performance with large datasets
const dedupRequest = async <T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl = 2000
): Promise<T> => {
  // Return existing promise if request is pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Create new request promise
  const promise = requestFn().finally(() => {
    // Remove from pending after ttl
    setTimeout(() => {
      pendingRequests.delete(key);
    }, ttl);
  });

  // Store promise
  pendingRequests.set(key, promise);
  return promise;
};


const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // This ensures cookies are sent with requests
});
// Add this to track failed requests to prevent loops
let failedRequestsCount = 0;
const MAX_FAILED_REQUESTS = 3;
let lastFailedEndpoint = '';
let isRedirecting = false;

// Improved response error interceptor
api.interceptors.response.use(
  (response) => {
    // Reset failed requests counter on success
    failedRequestsCount = 0;
    lastFailedEndpoint = '';
    return response;
  },
  (error) => {
    // Check if the request failed due to auth issues
    if (error.response?.status === 401) {
      console.log('Authentication error:', error.config?.url);
      
      // Track which endpoint is failing
      if (lastFailedEndpoint === error.config?.url) {
        failedRequestsCount++;
      } else {
        lastFailedEndpoint = error.config?.url;
        failedRequestsCount = 1;
      }
      
      // Prevent infinite loops by limiting retries
      if (failedRequestsCount >= MAX_FAILED_REQUESTS) {
        console.error(`Too many failed requests to ${lastFailedEndpoint}, stopping retries`);
        
        // Reset localStorage and redirect only once
        if (!isRedirecting) {
          isRedirecting = true;
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Only redirect if we're in the browser and not already on the login page
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            console.log('Redirecting to login page after too many failed requests');
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(new Error('Authentication failed after multiple attempts'));
      }
    }
    
    // Handle other errors
    console.error('Response error:', error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);

// Improved request interceptor
api.interceptors.request.use((config) => {
  // For backwards compatibility during transition - send token via header if available
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('Adding auth token to request:', config.url);
  } else {
    console.log('No auth token available for request:', config.url);
    // Allow login requests without a token
    if (!config.url?.includes('/auth/login') && !config.url?.includes('/auth/register')) {
      console.warn('Non-auth request without token:', config.url);
    }
  }
  
  // Add pagination support to optimize database queries
  if (config.method === 'get' && !config.params?.page) {
    config.params = { 
      ...config.params, 
      page: 1, 
      limit: 100 // Default to 100 items per page
    };
  }
  
  return config;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});
  
export const settingsAPI = {
  // Added return type and parameter type
  getSettings: async (): Promise<Settings> => {
    const response = await api.get('/settings');
    return response.data.data;
  },
  
  // Added parameter type
  updateSettings: async (settings: Settings): Promise<Settings> => {
    const response = await api.put('/settings', settings);
    return response.data.data;
  },
  
  // Updated to use extended interface that includes listId
  testIntegration: async (type: string, credentials: { apiKey: string; serverPrefix: string }): Promise<ExtendedIntegrationResponse> => {
    const response = await api.post(`/settings/test/${type}`, credentials);
    return response.data.data;
  },
  
  // Added parameter types
  enableIntegration: async (type: string, enabled: boolean, autoSync: boolean): Promise<{ enabled: boolean; autoSync: boolean }> => {
    const response = await api.post(`/settings/enable/${type}`, { enabled, autoSync });
    return response.data.data;
  },
  
  // Added parameter type
  sendNewsletter: async (newsletter: { subject: string; content: string }): Promise<any> => {
    const response = await api.post('/settings/newsletter', newsletter);
    return response.data.data;
  },
  
  // Added parameter types
  scheduleNewsletter: async (campaignId: string, sendTime: Date): Promise<any> => {
    const response = await api.post('/settings/newsletter/schedule', { campaignId, sendTime });
    return response.data.data;
  },
  
  // Added return type
  getSubscriberStats: async (): Promise<any> => {
    const response = await api.get('/settings/subscribers/stats');
    return response.data.data;
  },
  
  // Added return type
  syncSubscribers: async (): Promise<any[]> => {
    const response = await api.post('/settings/sync-subscribers');
    return response.data.data;
  },
  
  // Added parameter type and return type
  getCampaignStats: async (campaignId: string): Promise<any> => {
    const response = await api.get(`/settings/campaigns/${campaignId}/stats`);
    return response.data.data;
  }
};


export const newsletterAPI = {
  testIntegration: async (type: 'mailchimp') => {
    try {
      console.log(`Testing ${type} integration...`);
      
      // Get current settings with a proper type definition
      const settings = await settingsAPI.getSettings();
      
      // Use optional chaining and nullish coalescing to handle potential undefined values
      const apiKey = settings?.mailchimp?.apiKey ?? '';
      const serverPrefix = settings?.mailchimp?.serverPrefix ?? '';
      
      console.log('Testing with credentials:', {
        apiKeyLength: apiKey.length,
        apiKeyMasked: apiKey.startsWith('••••'),
        serverPrefix,
        hasApiKey: !!apiKey,
        hasServerPrefix: !!serverPrefix
      });
      
      // Don't try to test with masked key
      if (apiKey.startsWith('••••')) {
        return {
          success: false,
          message: 'Please enter your complete API key (masked keys cannot be used)'
        };
      }
      
      if (!apiKey) {
        return {
          success: false,
          message: 'Please enter your Mailchimp API Key'
        };
      }
      
      if (!serverPrefix) {
        return {
          success: false,
          message: 'Please enter your Mailchimp Server Prefix'
        };
      }
      
      // Send the API key and server prefix in the request body
      const response = await api.post(`/settings/test/${type}`, {
        apiKey,
        serverPrefix
      });
      
      return response.data.data;
    } catch (error: any) {
      console.error(`${type} integration test detailed error:`, error);
      
      return {
        success: false,
        message: error.response?.data?.data?.message || 
                 error.response?.data?.message ||
                 `Failed to connect to ${type}: ${error.message}`
      };
    }
  },

  getNewsletterStats: async (): Promise<NewsletterResponse> => {
    // Use deduplication for frequently called stats methods
    return dedupRequest('newsletterStats', async () => {
      try {
        const response = await api.get<ResponseData<NewsletterResponse>>('/newsletters/stats');
        return response.data.data;
      } catch (error) {
        console.error('API Error:', error);
        return {
          newsletters: [],
          qualityStats: {
            averageScore: 0,
            qualityDistribution: { high: 0, medium: 0, low: 0 },
            topPerformers: []
          }
        };
      }
    });
  },
  
  getAll: async () => {
    try {
      const response = await api.get<ResponseData<NewsletterWithStats[]>>('/newsletters');
      return response.data.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  
 getOne: async (id: string) => {
   try {
     const response = await api.get<ResponseData<Newsletter>>(`/newsletters/${id}`);
     return response.data.data;
   } catch (error) {
     handleError(error as AxiosError);
   }
 },
 create: async (data: Omit<Newsletter, 'id' | 'sentTo' | 'createdBy'>) => {
  try {
    const response = await api.post<ResponseData<Newsletter>>('/newsletters', data);
    return response.data.data;
  } catch (error) {
    handleError(error as AxiosError);
  }
},
 update: async (id: string, data: Partial<Newsletter>) => {
   try {
     const response = await api.patch<ResponseData<Newsletter>>(`/newsletters/${id}`, data);
     return response.data.data;
   } catch (error) {
     handleError(error as AxiosError);
   }
 },
 delete: async (id: string) => {
   try {
     await api.delete(`/newsletters/${id}`);
   } catch (error) {
     handleError(error as AxiosError);
   }
 },
 schedule: async (id: string, scheduledDate: string) => {
  try {
    const timestamp = new Date(scheduledDate).getTime();
    console.log('Scheduling with timestamp:', timestamp);
    const response = await api.post<ResponseData<Newsletter>>(`/newsletters/${id}/schedule`, { scheduledDate: timestamp });
    return response.data.data;
  } catch (error) {
    handleError(error as AxiosError);
  }
},
send: async (id: string) => {
  try { 
    console.log(`Attempting to send newsletter ${id}...`);
    
    // Add timeout to prevent hanging requests
    const response = await api.post<ResponseData<Newsletter>>(
      `/newsletters/${id}/send`,
      {},  // Empty body
      { timeout: 30000 }  // 30 second timeout for newsletter sending
    );
    
    console.log(`Newsletter sent successfully:`, response.data);
    return response.data.data;
  } catch (error) {
    console.error('Newsletter send error:', error);
    
    // Extract specific error message if available
    let errorMessage = 'Failed to send newsletter';
    if ((error as AxiosError).response?.data as any) {
      errorMessage = ((error as AxiosError).response?.data as any)?.message;
    } else if ((error as AxiosError).message) {
      errorMessage = (error as AxiosError).message;
    }
    
    // Throw a more descriptive error
    throw new APIError(
      (error as AxiosError).response?.status || 500,
      errorMessage
    );
  }
}
};

export const subscriberAPI = {
  bulkDelete: async (ids: string[]) => {
    try {
      await api.post('/subscribers/bulk-delete', { ids });
    } catch (error) {
      console.error('Error bulk deleting subscribers:', error);
      handleError(error as AxiosError);
    }
  },
  
 // Added pagination support for handling 10,000+ subscribers efficiently
 getAll: async (page = 1, limit = 500) => {
  try {
    const config: AxiosRequestConfig = {
      params: { page, limit }
    };
    const response = await api.get<ResponseData<Subscriber[]>>('/subscribers', config);
     // Transform response to ensure it matches the Subscriber interface
     const subscribers = response.data.data.map(sub => ({
      id: sub.id || sub._id || '',
      _id: sub._id,
      email: sub.email,
      name: sub.name,
      status: sub.status as 'active' | 'unsubscribed',
      subscribed: sub.subscribed || (sub as any).subscribedDate || new Date().toISOString(),
      source: sub.source as 'mailchimp' | 'csv' | 'manual' | undefined
    }));
    
    return subscribers;
  } catch (error) {
    console.error('Error fetching subscribers:', error);
    handleError(error as AxiosError);
  }
},
 create: async (data: Omit<Subscriber, 'id' | 'subscribedDate'>) => {
   try {
     const response = await api.post<ResponseData<Subscriber>>('/subscribers', data);
     return response.data.data;
   } catch (error) {
     handleError(error as AxiosError);
   }
 },
 // Updated to use updateStatus for proper mailchimp sync
 delete: async (id: string) => {
  try {
    // Instead of deleting, update the status to unsubscribed
    // This ensures proper syncing with mailchimp
    await subscriberAPI.updateStatus(id, 'unsubscribed');
    return { success: true };
  } catch (error) {
    if ((error as AxiosError).response?.status === 404) {
      console.log('Subscriber already deleted:', id);
      return { success: true };
    }
    console.error('Error removing subscriber:', error);
    handleError(error as AxiosError);
  }
},


// For importing large subscriber lists efficiently
import: async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add chunked upload capability for large files
    const response = await api.post<ResponseData<{ imported: number }>>('/subscribers/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      // Increased timeout for large uploads
      timeout: 120000 // 2 minutes
    });
    return response.data.data;
  } catch (error) {
    handleError(error as AxiosError);
  }
},

export: async () => {
  try {
    const response = await api.get<Blob>('/subscribers/export', { 
      responseType: 'blob',
      headers: {
        'Accept': 'text/csv'
      },
      // Increased timeout for large exports
      timeout: 300000 // 5 minutes
    });
    return response.data;
  } catch (error) {
    handleError(error as AxiosError);
  }
},
syncMailchimp: async () => {
  try {
    // This will sync subscribers from the user's Mailchimp account
    const response = await api.post('/settings/sync-subscribers');
    return response.data.data;
  } catch (error) {
    console.error('Error syncing Mailchimp subscribers:', error);
    throw error;
  }
},
 // Enhanced with better error handling and retry logic
 updateStatus: async (id: string, status: 'active' | 'unsubscribed') => {
  try {
    console.log(`Updating subscriber ${id} status to ${status}`);
    const response = await api.patch(`/subscribers/${id}/status`, { status });
    
    // Verify the response contains the updated status
    if (response.data?.data?.status !== status) {
      console.warn('Status update response mismatch:', response.data?.data?.status, 'expected:', status);
    }
    
    return response.data.data;
  } catch (error) {
    console.error('Error updating subscriber status:', error);
    // Retry once on failure
    try {
      console.log('Retrying status update...');
      const response = await api.patch(`/subscribers/${id}/status`, { status });
      return response.data.data;
    } catch (retryError) {
      console.error('Status update retry failed:', retryError);
      throw retryError;
    }
  }
}
};



export const analyticsAPI = {
  getSummary: async () => {
    try {
      const response = await api.get<ResponseData<any>>('/analytics/summary');
      console.log('Analytics response:', response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error('Detailed API Error:', error);
      throw new APIError(500, 'Failed to fetch analytics summary');
    }
  },

 getNewsletterStats: async (id: string) => {
   try {
     const response = await api.get<ResponseData<NewsletterStats>>(`/analytics/newsletter/${id}`);
     return response.data.data;
   } catch (error) {
     handleError(error as AxiosError);
   }
 },
 getGrowthData: async (period: string) => {
   try {
     const response = await api.get<ResponseData<GrowthData[]>>(`/analytics/growth?period=${period}`);
     return response.data.data;
   } catch (error) {
     handleError(error as AxiosError);
   }
 },
 getEngagementMetrics: async () => {
   try {
     const response = await api.get<ResponseData<EngagementMetrics>>('/analytics/engagement');
     return response.data.data;
   } catch (error) {
     handleError(error as AxiosError);
   }
 }
};

export const authAPI = {
  testConnection: async () => {
    try {
      // Check if token exists before making the request
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping auth check');
        return { status: 'error', authenticated: false };
      }
      
      const response = await api.get('/auth/me');
      console.log('Auth check response:', response.data);
      return { ...response.data, status: 'success', authenticated: true };
    } catch (error) {
      console.error('Auth check failed:', error);
      // Handle 404 errors gracefully - API endpoint might not be available
      if ((error as AxiosError).response?.status === 404) {
        console.log('Auth endpoint not found, API might be unreachable');
        return { status: 'error', authenticated: false, error: 'API_UNREACHABLE' };
      }
      // Return a structured error response instead of throwing
      return { status: 'error', authenticated: false, error: 'AUTH_ERROR' };
    }
  },

  login: async (credentials: { email: string; password: string }) => {
    try {
      // Add a timeout to avoid hanging requests
      const response = await api.post('/auth/login', credentials, {
        timeout: 10000 // 10 second timeout
      });
      console.log('Login response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('Login error:', error);
      // Special handling for 404 errors - don't throw, return a structured error response
      if ((error as AxiosError).response?.status === 404) {
        return { 
          status: 'error', 
          message: 'Login endpoint not available. Is the API server running?' 
        };
      }
      
      // For connection errors, return a better message
      if ((error as AxiosError).code === 'ECONNREFUSED' || 
          (error as AxiosError).message.includes('Network Error')) {
        return {
          status: 'error',
          message: 'Cannot connect to authentication server. Please try again later.'
        };
      }
      
      // For other errors, let handleError function format them
      handleError(error as AxiosError);
    }
  },

  register: async (data: { email: string; password: string }) => {
    try {
      const response = await api.post('/auth/register', data, {
        timeout: 10000 // 10 second timeout
      });
      console.log('Register response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('Register error:', error);
      // Special handling for 404 errors
      if ((error as AxiosError).response?.status === 404) {
        return { 
          status: 'error', 
          message: 'Registration endpoint not available. Is the API server running?' 
        };
      }
      
      // For connection errors, return a better message
      if ((error as AxiosError).code === 'ECONNREFUSED' || 
          (error as AxiosError).message.includes('Network Error')) {
        return {
          status: 'error',
          message: 'Cannot connect to authentication server. Please try again later.'
        };
      }
      
      handleError(error as AxiosError);
    }
  },
  
  logout: async () => {
    try {
      await api.post('/auth/logout');
      return { status: 'success' };
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout API fails, we can still clear local state
      return { status: 'success', message: 'Logged out locally' };
    }
  }
};
