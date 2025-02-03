// src/services/api.ts
import axios, { AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Types
interface Newsletter {
  id: string;
  title: string;
  subject: string;
  content: string;
  status: 'draft' | 'scheduled' | 'sent';
  scheduledDate?: string;
  sentDate?: string;
}

interface Subscriber {
  id: string;
  email: string;
  name: string;
  status: 'active' | 'unsubscribed';
  subscribedDate: string;
}

interface AnalyticsSummary {
  subscribers: { total: number; change: number };
  newsletters: { total: number; change: number };
  openRate: { value: number; change: number };
}

// Error handling
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
  if (error.message === 'Network Error') {
    console.error('Backend server is not accessible');
    throw new APIError(503, 'Service unavailable: Cannot connect to server');
  }
  throw new APIError(500, error.message);
};

// API instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API endpoints
export const newsletterAPI = {
  getAll: async () => {
    try {
      const response = await api.get<Newsletter[]>('/newsletters');
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  getOne: async (id: string) => {
    try {
      const response = await api.get<Newsletter>(`/newsletters/${id}`);
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  create: async (data: Omit<Newsletter, 'id'>) => {
    try {
      const response = await api.post<Newsletter>('/newsletters', data);
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  update: async (id: string, data: Partial<Newsletter>) => {
    try {
      const response = await api.patch<Newsletter>(`/newsletters/${id}`, data);
      return response.data;
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
      const response = await api.post<Newsletter>(`/newsletters/${id}/schedule`, { scheduledDate });
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  send: async (id: string) => {
    try {
      const response = await api.post<Newsletter>(`/newsletters/${id}/send`);
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  }
};

export const subscriberAPI = {
  getAll: async () => {
    try {
      const response = await api.get<Subscriber[]>('/subscribers');
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  create: async (data: Omit<Subscriber, 'id' | 'subscribedDate'>) => {
    try {
      const response = await api.post<Subscriber>('/subscribers', data);
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  delete: async (id: string) => {
    try {
      await api.delete(`/subscribers/${id}`);
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  import: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<{ imported: number }>('/subscribers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  export: async () => {
    try {
      const response = await api.get('/subscribers/export', { responseType: 'blob' });
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  }
};

export const analyticsAPI = {
  getSummary: async () => {
    try {
      const response = await api.get<AnalyticsSummary>('/analytics/summary');
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  getNewsletterStats: async (id: string) => {
    try {
      const response = await api.get(`/analytics/newsletter/${id}`);
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  getGrowthData: async (period: string) => {
    try {
      const response = await api.get(`/analytics/growth?period=${period}`);
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  getEngagementMetrics: async () => {
    try {
      const response = await api.get('/analytics/engagement');
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  }
};

export const authAPI = {
  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await api.post<{ token: string; user: any }>('/auth/login', credentials);
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
    }
  },
  register: async (data: { email: string; password: string }) => {
    try {
      const response = await api.post<{ token: string; user: any }>('/auth/register', data);
      return response.data;
    } catch (error) {
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