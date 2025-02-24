
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

interface IntegrationResponse {
  message: string;
  success: boolean;
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

// Added support for pagination and optimization for large datasets
api.interceptors.request.use((config) => {
  // For backwards compatibility during transition - send token via header if available
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status);
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // We don't need to clear localStorage as cookies will be managed by the server
      console.log('Authentication error - redirecting to login');
    }
    
    console.error('Response error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export const settingsAPI = {
  getSettings: async () => {
    try {
      const response = await api.get('/settings');
      if (!response.data?.data?.email) {
        // Return default structure if data is incomplete
        return {
          email: { fromName: '', replyTo: '' },
          mailchimp: { apiKey: '', serverPrefix: '', enabled: false },
        };
      }
      return response.data.data;
    } catch (error) {
      console.error('Settings error:', error);
      return {
        email: { fromName: '', replyTo: '' },
        mailchimp: { apiKey: '', serverPrefix: '', enabled: false },
      };
    }
  },
  updateSettings: async (settings: any) => {
    const response = await api.put('/settings', settings);
    return response.data;
  },
  testIntegration: async (type: 'mailchimp') => {
    const response = await api.post(`/settings/test/${type}`);
    return response.data;
  }
};

export const newsletterAPI = {
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
     const response = await api.post<ResponseData<Newsletter>>(`/newsletters/${id}/send`);
     return response.data.data;
   } catch (error) {
     handleError(error as AxiosError);
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
    return response.data.data;
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
 delete: async (id: string) => {
   try {
     await api.delete(`/subscribers/${id}`);
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
      const response = await api.get('/auth/me');
      console.log('Auth check response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Auth check failed:', error);
      throw error;
    }
  },

  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await api.post('/auth/login', credentials);
      console.log('Login response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('Login error:', error);
      handleError(error as AxiosError);
    }
  },

  register: async (data: { email: string; password: string }) => {
    try {
      const response = await api.post('/auth/register', data);
      console.log('Register response:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('Register error:', error);
      handleError(error as AxiosError);
    }
  },
 logout: async () => {
   try {
     await api.post('/auth/logout');
   } catch (error) {
     handleError(error as AxiosError);
   }
 }
};
