
import axios, { AxiosError } from 'axios';

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
 openRate: number;
 clickRate: number;
 title: string;
 subject: string;
 content: string;
 status: 'draft' | 'scheduled' | 'sent';
 scheduledDate?: string;
 sentDate?: string;
 opens?: Array<{ subscriberId: string; timestamp: Date }>;
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

interface AnalyticsSummary {
 subscribers: { total: number; change: number };
 newsletters: { total: number; change: number };
 openRate: { value: number; change: number };
}

interface NewsletterStats {
 opens: number;
 clicks: number;
 bounces: number;
 unsubscribes: number;
}

interface GrowthData {
 date: string;
 subscribers: number;
}

interface EngagementMetrics {
 openRate: number;
 clickRate: number;
 bounceRate: number;
 unsubscribeRate: number;
}

interface NewsletterWithStats extends Omit<Newsletter, 'opens'> {
  openRate: number;
  opens: number;
  sent: number;
}

interface IntegrationResponse {
  message: string;
  success: boolean;
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

const handleError = (error: AxiosError) => {
  if (error.response) {
    const statusCode = error.response.status;
    const responseData = error.response.data as ResponseData<any>;
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


const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true 
});

// Add request interceptor for debugging
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.status);
    return response;
  },
  (error) => {
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
          substack: { apiKey: '', publication: '', enabled: false }
        };
      }
      return response.data.data;
    } catch (error) {
      console.error('Settings error:', error);
      return {
        email: { fromName: '', replyTo: '' },
        mailchimp: { apiKey: '', serverPrefix: '', enabled: false },
        substack: { apiKey: '', publication: '', enabled: false }
      };
    }
  },
  updateSettings: async (settings: any) => {
    const response = await api.put('/settings', settings);
    return response.data;
  },
  testIntegration: async (type: 'mailchimp' | 'substack') => {
    const response = await api.post(`/settings/test/${type}`);
    return response.data;
  }
};

export const newsletterAPI = {
  getNewsletterStats: async () => {
    try {
      const response = await api.get<ResponseData<Newsletter[]>>('/newsletters/stats');
      return response.data.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
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
 create: async (data: Omit<Newsletter, 'id' | 'sentTo' | 'openRate' | 'clickRate' | 'createdBy'>) => {
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
  
 getAll: async () => {
   try {
     const response = await api.get<ResponseData<Subscriber[]>>('/subscribers');
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
   } catch (error) {
    console.error('Error removing subscriber:', error);
     handleError(error as AxiosError);
   }
 },
 import: async (file: File) => {
   try {
     const formData = new FormData();
     formData.append('file', file);
     const response = await api.post<ResponseData<{ imported: number }>>('/subscribers/import', formData, {
       headers: { 'Content-Type': 'multipart/form-data' }
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
      }
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
      const response = await api.get('/health');
      console.log('Backend connection test:', response.data);
      return response.data;
    } catch (error) {
      console.error('Backend connection test failed:', error);
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
