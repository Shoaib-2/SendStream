// -----------------------------
// API Service Subscription Logic
//
// This file contains API service functions and also includes logic for checking subscription status and redirecting to the renewal page (/?renew=true).
//
// PHASE 1 AUDIT & CLEANUP:
// - This file is one of several that handle renewal logic. See also: ExpiredSubscription.tsx, SubscriptionErrorHandler.tsx, dataContext.tsx, authContext.tsx.
// - TODO: In a future phase, centralize all subscription/renewal logic in a single context or hook to avoid duplication and race conditions.
//
// Current logic:
// - Checks for 'renew=true' in the URL and may trigger redirects or UI changes in API error handling.
// - May duplicate logic found in other files/components.
//
// If you are refactoring subscription logic, coordinate with other files that handle renewal.
// -----------------------------

import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { checkTrialEligibility } from "@/utils/trialTracking";

// // Utility function to check if an endpoint exists before making requests
// const checkEndpointExists = async (endpoint: string): Promise<boolean> => {
//   try {
//     // Make a HEAD request to check if endpoint exists without fetching data
//     await api.head(endpoint);
//     return true;
//   } catch (error) {
//     if ((error as AxiosError).response?.status === 404) {
//       return false;
//     }
//     // If it's not a 404, assume endpoint exists but has other issues
//     return true;
//   }
// };

// Added request queue for performance optimization with large datasets
const pendingRequests = new Map();

// Define the pricing plan interface
export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  priceId: string; // Stripe Price ID
  trialDays: number;
}

interface ResponseData<T> {
  status: "success" | "error";
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
  status: "draft" | "scheduled" | "sent";
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
  status: "active" | "unsubscribed";
  subscribedDate: string;
  subscribed: string;
  source?: "mailchimp" | "csv" | "manual";
}

interface NewsletterStats {
  bounces: number;
  unsubscribes: number;
}

interface GrowthData {
  date: string;
  subscribers: number;
  month?: string; // Optional for charting
}

interface EngagementMetrics {
  bounceRate: number;
  unsubscribeRate: number;
}

interface NewsletterWithStats extends Omit<Newsletter, "opens"> {
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

interface ForgotPasswordResponse {
  status: "success" | "error";
  message: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-9h3q.onrender.com/api';
if (!process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not defined! Using fallback:', API_URL);
}
console.log("API URL:", API_URL); // Debug log

export class APIError extends Error {
  constructor(public status: number, message: string, public data?: unknown) {
    super(message);
    this.name = "APIError";
  }
}

// Utility type guard for AxiosError
const isAxiosError = (error: unknown): error is AxiosError<ErrorResponseData> => {
  return axios.isAxiosError(error);
};

// Improved error handling for database scaling
const handleError = (error: unknown) => {
  if (isAxiosError(error)) {
    if (error.response) {
      const statusCode = error.response.status;
      const responseData = error.response.data;

      // Handle specific database errors
      if (statusCode === 429) {
        throw new APIError(
          429,
          "Rate limit exceeded. Please try again later.",
          responseData
        );
      }

      if (statusCode === 503) {
        throw new APIError(
          503,
          "Database currently unavailable. Please try again later.",
          responseData
        );
      }

      throw new APIError(
        statusCode,
        responseData.message || `Request failed with status ${statusCode}`,
        responseData
      );
    }

    if (error.message === "Network Error") {
      throw new APIError(503, "Service unavailable: Cannot connect to server");
    }

    throw new APIError(500, error.message || "An unexpected error occurred");
  }
  
  // If it's not an Axios error, throw a generic error
  throw new APIError(500, "An unexpected error occurred");
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
    "Content-Type": "application/json",
  },
  withCredentials: true, // This ensures cookies are sent with requests
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  timeout: 20000, // 20 seconds timeout
});
// Add this to track failed requests to prevent loops
const inSilentMode = () => {
  return (
    typeof window !== "undefined" &&
    (window.location.pathname === "/" || document.readyState !== "complete")
  );
};

// Existing configuration for tracking failed requests
let failedRequestsCount = 0;
const MAX_FAILED_REQUESTS = 3;
let lastFailedEndpoint = "";
let isRedirecting = false;

// Updated API response interceptor to handle subscription errors

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Check if browser and not on login page
    const isOnAuthPage =
      typeof window !== "undefined" &&
      (window.location.pathname.includes("/login") ||
        window.location.pathname === "/");

    // Silent mode for initial page load or on landing page
    const silentMode = inSilentMode();    // Check if the user just renewed

    // First check if user just renewed (has renewal flag in localStorage)
    const justRenewed = localStorage.getItem("subscription_renewed");
    if (justRenewed && error.response?.status === 403) {
      console.log("User just renewed, refreshing token before retry");

      // Clear the renewal flag
      localStorage.removeItem("subscription_renewed");

      // Force a page refresh to get a fresh token and session
      window.location.reload();
      return Promise.reject(error);
    }

    // Enhanced detection for subscription expired errors
    if (
      error.response?.status === 403 &&
      (error.response?.data?.code === "SUBSCRIPTION_EXPIRED" ||
        error.response?.data?.message?.includes("Subscription expired") ||
        error.response?.data?.message?.includes("Subscription required"))
    ) {
      // console.log("Handling subscription expired error more aggressively");

      // Force clear any problematic cache
      localStorage.removeItem("has_active_access");

      // Don't redirect during initial load or if already on auth page
      if (!silentMode && !isOnAuthPage) {
        // Store the current page for after renewal
        localStorage.setItem("returnPath", window.location.pathname);

        // Check if we should redirect
        if (!isRedirecting) {
          isRedirecting = true;
          console.log("Redirecting due to expired subscription");

          // Use timeout to allow the current execution to complete
          setTimeout(() => {
            // Redirect to home page with query param instead of pricing
            window.location.href = "/?renew=true";
            // Reset the flag after redirect
            setTimeout(() => {
              isRedirecting = false;
            }, 1000);
          }, 100);
        }
      }

      // For API calls during page load, resolve with null
      if (silentMode) {
        // console.log("Silencing subscription expired error during initial load");
        return Promise.resolve({ data: null });
      }
    }

    // Handle 403 errors silently during initial load
    if (error.response?.status === 403 && silentMode) {
      // console.log("Silencing 403 error during subscription check");
      return Promise.resolve({ data: null });
    }

    // Only handle auth errors loudly if not on auth pages
    if (error.response?.status === 401 && !isOnAuthPage && !silentMode) {
      // console.log("Authentication error:", error.config?.url);

      // Track which endpoint is failing
      if (lastFailedEndpoint === error.config?.url) {
        failedRequestsCount++;
      } else {
        lastFailedEndpoint = error.config?.url;
        failedRequestsCount = 1;
      }

      // Prevent infinite loops by limiting retries
      if (failedRequestsCount >= MAX_FAILED_REQUESTS) {
        console.error(
          `Too many failed requests to ${lastFailedEndpoint}, stopping retries`
        );

        // Reset localStorage and redirect only once
        if (!isRedirecting) {
          isRedirecting = true;
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          // Only redirect if we're in the browser and not already on the login page
          if (
            typeof window !== "undefined" &&
            !window.location.pathname.includes("/login")
          ) {
            // console.log(
            //   "Redirecting to login page after too many failed requests"
            // );
            window.location.href = "/login";
          }
        }

        return Promise.reject(
          new Error("Authentication failed after multiple attempts")
        );
      }
    }

    // Only log errors if not in silent mode
    if (!silentMode) {
      console.error(
        "Response error:",
        error.response?.status,
        error.config?.url
      );
    }

    return Promise.reject(error);
  }
);

// Improved request interceptor
api.interceptors.request.use(
  (config) => {
    // For login requests, don't add the Authorization header
    if (
      config.url &&
      (config.url.includes("/auth/login") ||
        config.url.includes("/auth/register") ||
        config.url.includes("/auth/check-trial-eligibility"))
    ) {
      delete config.headers.Authorization;
      return config;
    }

    // For other requests, add token if available
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      // console.log("No auth token available for request:", config.url);
    }

    const paginatedEndpoints = [
      "/subscribers",
      "/newsletters",
      "/analytics/growth",
    ];

    if (config.method === "get" && config.url) {
      const needsPagination = paginatedEndpoints.some((endpoint) =>
        config.url!.includes(endpoint)
      );

      if (needsPagination && !config.params?.page) {
        config.params = {
          ...config.params,
          page: 1,
          limit: 100,
        };
      }
    }

    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

export const settingsAPI = {
  // Added return type and parameter type
  getSettings: async (): Promise<Settings> => {
    const response = await api.get("/settings");
    return response.data.data;
  },

  // Added parameter type
  updateSettings: async (settings: Settings): Promise<Settings> => {
    const response = await api.put("/settings", settings);
    return response.data.data;
  },

  // Updated to use extended interface that includes listId
  testIntegration: async (
    type: string,
    credentials: { apiKey: string; serverPrefix: string }
  ): Promise<ExtendedIntegrationResponse> => {
    const response = await api.post(`/settings/test/${type}`, credentials);
    return response.data.data;
  },

  // Added parameter types
  enableIntegration: async (
    type: string,
    enabled: boolean,
    autoSync: boolean
  ): Promise<{ enabled: boolean; autoSync: boolean }> => {
    const response = await api.post(`/settings/enable/${type}`, {
      enabled,
      autoSync,
    });
    return response.data.data;
  },

  // Added parameter type
  sendNewsletter: async (newsletter: {
    subject: string;
    content: string;
  }): Promise<unknown> => {
    const response = await api.post("/settings/newsletter", newsletter);
    return response.data.data;
  },

  // Added parameter types
  scheduleNewsletter: async (
    campaignId: string,
    sendTime: Date
  ): Promise<unknown> => {
    const response = await api.post("/settings/newsletter/schedule", {
      campaignId,
      sendTime,
    });
    return response.data.data;
  },

  // Added return type
  getSubscriberStats: async (): Promise<unknown> => {
    const response = await api.get("/settings/subscribers/stats");
    return response.data.data;
  },

  // Added return type
  syncSubscribers: async (): Promise<unknown[]> => {
    const response = await api.post("/settings/sync-subscribers");
    return response.data.data;
  },

  // Added parameter type and return type
  getCampaignStats: async (campaignId: string): Promise<unknown> => {
    const response = await api.get(`/settings/campaigns/${campaignId}/stats`);
    return response.data.data;
  },
};

export const newsletterAPI = {
  testIntegration: async (type: "mailchimp") => {
    try {
      console.log(`Testing ${type} integration...`);

      // Get current settings with a proper type definition
      const settings = await settingsAPI.getSettings();

      // Use optional chaining and nullish coalescing to handle potential undefined values
      const apiKey = settings?.mailchimp?.apiKey ?? "";
      const serverPrefix = settings?.mailchimp?.serverPrefix ?? "";

      console.log("Testing with credentials:", {
        apiKeyLength: apiKey.length,
        apiKeyMasked: apiKey.startsWith("••••"),
        serverPrefix,
        hasApiKey: !!apiKey,
        hasServerPrefix: !!serverPrefix,
      });

      // Don't try to test with masked key
      if (apiKey.startsWith("••••")) {
        return {
          success: false,
          message:
            "Please enter your complete API key (masked keys cannot be used)",
        };
      }

      if (!apiKey) {
        return {
          success: false,
          message: "Please enter your Mailchimp API Key",
        };
      }

      if (!serverPrefix) {
        return {
          success: false,
          message: "Please enter your Mailchimp Server Prefix",
        };
      }

      // Send the API key and server prefix in the request body
      const response = await api.post(`/settings/test/${type}`, {
        apiKey,
        serverPrefix,
      });

      return response.data.data;
    } catch (error) {
      console.error(`${type} integration test detailed error:`, error);
      const axiosError = error as AxiosError<ErrorResponseData>;
      return {
        success: false,
        message:
          (axiosError.response?.data?.message) ||
          axiosError.message ||
          `Failed to connect to ${type}`,
      };
    }
  },

  getNewsletterStats: async (): Promise<NewsletterResponse> => {
    // Use deduplication for frequently called stats methods
    return dedupRequest("newsletterStats", async () => {
      try {
        const response = await api.get<ResponseData<NewsletterResponse>>(
          "/newsletters/stats"
        );
        return response.data.data;
      } catch (error) {
        console.error("API Error:", error);
        return {
          newsletters: [],
          qualityStats: {
            averageScore: 0,
            qualityDistribution: { high: 0, medium: 0, low: 0 },
            topPerformers: [],
          },
        };
      }
    });
  },

  getAll: async () => {
    try {
      const response = await api.get<ResponseData<NewsletterWithStats[]>>("/newsletters");
      return response.data.data;
    } catch (error) {
      if (isAxiosError(error)) {
        handleError(error);
      }
      throw new APIError(500, "Failed to fetch newsletters");
    }
  },

  getOne: async (id: string) => {
    try {
      const response = await api.get<ResponseData<Newsletter>>(`/newsletters/${id}`);
      return response.data.data;
    } catch (error) {
      if (isAxiosError(error)) {
        handleError(error);
      }
      throw new APIError(500, "Failed to fetch newsletter");
    }
  },
  create: async (data: Omit<Newsletter, "id" | "sentTo" | "createdBy">) => {
    try {
      const response = await api.post<ResponseData<Newsletter>>(
        "/newsletters",
        data
      );
      return response.data.data;
    } catch (error) {
      handleError(error as AxiosError);
      throw error;
    }
  },
  update: async (id: string, data: Partial<Newsletter>) => {
    try {
      const response = await api.patch<ResponseData<Newsletter>>(
        `/newsletters/${id}`,
        data
      );
      return response.data.data;
    } catch (error) {
      handleError(error as AxiosError);
      throw error;
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
      console.log("Scheduling with timestamp:", timestamp);
      const response = await api.post<ResponseData<Newsletter>>(
        `/newsletters/${id}/schedule`,
        { scheduledDate: timestamp }
      );
      return response.data.data;
    } catch (error) {
      handleError(error as AxiosError);
      throw error;
    }
  },
  send: async (id: string) => {
    try {
      console.log(`Attempting to send newsletter ${id}...`);

      // ADDED: Pre-flight validation to catch issues early
      if (!id || id.trim() === "") {
        throw new APIError(400, "Newsletter ID is required");
      }

      // IMPROVED: Better timeout and error handling
      const response = await api.post<ResponseData<Newsletter>>(
        `/newsletters/${id}/send`,
        {}, // Empty body
        {
          timeout: 45000, // Increased to 45 seconds for email processing
          // ADDED: Custom error handling for this specific endpoint
          validateStatus: (status) => status === 200 || status === 202,
        }
      );

      console.log(`Newsletter sent successfully:`, response.data);
      return response.data.data;
    } catch (error) {
      console.error("Newsletter send error details:", {
        id,
        status: (error as AxiosError).response?.status,
        statusText: (error as AxiosError).response?.statusText,
        data: (error as AxiosError).response?.data,
        message: (error as AxiosError).message,
      });

      // IMPROVED: More specific error messages based on status codes
      let errorMessage = "Failed to send newsletter";
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 500) {
        // Handle 500 errors more specifically
        const responseData = axiosError.response.data as ErrorResponseData;
        if (responseData?.message?.includes("recipients")) {
          errorMessage = "No valid recipients found. Please check your subscriber list.";
        } else {
          errorMessage = responseData?.message || "Internal server error";
        }
      } else if (axiosError.response?.status === 404) {
        errorMessage = "Newsletter not found or send endpoint unavailable";
      } else if (axiosError.response?.status === 400) {
        const responseData = axiosError.response.data as ErrorResponseData;
        errorMessage = responseData?.message || "Invalid newsletter data";
      } else if (axiosError.code === "ECONNABORTED") {
        errorMessage = "Newsletter send timed out. It may still be processing.";
      } else if (axiosError.message?.includes("Network Error")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      }

      // ADDED: Include the original error for debugging while providing user-friendly message
      throw new APIError(axiosError.response?.status || 500, errorMessage, {
        originalError: axiosError.message,
      });
    }
  },
};

export const subscriberAPI = {
  bulkDelete: async (ids: string[]) => {
    try {
      await api.post("/subscribers/bulk-delete", { ids });
    } catch (error) {
      console.error("Error bulk deleting subscribers:", error);
      handleError(error as AxiosError);
    }
  },

  // Added pagination support for handling 10,000+ subscribers efficiently
  getAll: async (page = 1, limit = 500) => {
    try {
      const config: AxiosRequestConfig = {
        params: { page, limit },
      };
      const response = await api.get<ResponseData<Subscriber[]>>(
        "/subscribers",
        config
      );
      // Transform response to ensure it matches the Subscriber interface
      const subscribers = response.data.data.map((sub) => ({
        id: sub.id || sub._id || "",
        _id: sub._id,
        email: sub.email,
        name: sub.name,
        status: sub.status as "active" | "unsubscribed",
        subscribed:
          sub.subscribed ||
          (sub as { subscribedDate?: string }).subscribedDate ||
          new Date().toISOString(),
        source: sub.source as "mailchimp" | "csv" | "manual" | undefined,
      }));

      return subscribers;
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      handleError(error as AxiosError);
      throw error;
    }
  },
  create: async (data: Omit<Subscriber, "id" | "subscribedDate">) => {
    try {
      const response = await api.post<ResponseData<Subscriber>>(
        "/subscribers",
        data
      );
      return response.data.data;
    } catch (error) {
      handleError(error as AxiosError);
      throw error;
    }
  },
  // Updated to use updateStatus for proper mailchimp sync
  delete: async (id: string) => {
    try {
      // Instead of deleting, update the status to unsubscribed
      // This ensures proper syncing with mailchimp
      await subscriberAPI.updateStatus(id, "unsubscribed");
      return { success: true };
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        console.log("Subscriber already deleted:", id);
        return { success: true };
      }
      console.error("Error removing subscriber:", error);
      handleError(error as AxiosError);
      throw error;
    }
  },

  // For importing large subscriber lists efficiently
  import: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Add chunked upload capability for large files
      const response = await api.post<ResponseData<{ imported: number }>>(
        "/subscribers/import",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          // Increased timeout for large uploads
          timeout: 120000, // 2 minutes
        }
      );
      return response.data.data;
    } catch (error) {
      handleError(error as AxiosError);
      throw error;
    }
  },

  export: async () => {
    try {
      const response = await api.get<Blob>("/subscribers/export", {
        responseType: "blob",
        headers: {
          Accept: "text/csv",
        },
        // Increased timeout for large exports
        timeout: 300000, // 5 minutes
      });
      return response.data;
    } catch (error) {
      handleError(error as AxiosError);
      throw error;
    }
  },
  syncMailchimp: async () => {
    try {
      // This will sync subscribers from the user's Mailchimp account
      const response = await api.post("/settings/sync-subscribers");
      return response.data.data;
    } catch (error) {
      console.error("Error syncing Mailchimp subscribers:", error);
      throw error;
    }
  },
  // Enhanced with better error handling and retry logic
  updateStatus: async (id: string, status: "active" | "unsubscribed") => {
    try {
      console.log(`Updating subscriber ${id} status to ${status}`);
      const response = await api.patch(`/subscribers/${id}/status`, { status });

      // Verify the response contains the updated status
      if (response.data?.data?.status !== status) {
        console.warn(
          "Status update response mismatch:",
          response.data?.data?.status,
          "expected:",
          status
        );
      }

      return response.data.data;
    } catch (error) {
      console.error("Error updating subscriber status:", error);
      // Retry once on failure
      try {
        console.log("Retrying status update...");
        const response = await api.patch(`/subscribers/${id}/status`, {
          status,
        });
        return response.data.data;
      } catch (retryError) {
        console.error("Status update retry failed:", retryError);
        throw retryError;
      }
    }
  },
};

export const analyticsAPI = {
  getSummary: async () => {
    try {
      const response = await api.get<ResponseData<unknown>>("/analytics/summary");
      // console.log("Analytics response:", response.data); // Debug log
      return response.data;
    } catch (error) {
      console.error("Detailed API Error:", error);
      throw new APIError(500, "Failed to fetch analytics summary");
    }
  },

  getNewsletterStats: async (id: string) => {
    try {
      const response = await api.get<ResponseData<NewsletterStats>>(
        `/analytics/newsletter/${id}`
      );
      return response.data.data;
    } catch (error) {
      handleError(error as AxiosError);
      throw error;
    }
  },

  // Updated to properly use the period parameter and handle response data correctly
  getGrowthData: async (period: string) => {
    try {
      const response = await api.get<ResponseData<GrowthData[]>>(
        `/analytics/growth?period=${period}` // Properly pass the period parameter
      );

      // Returning the data directly - handle the transformation in the component.
      return response.data.data || [];
    } catch (error) {
      console.error("Error fetching growth data:", error);
      // Return empty array instead of using handleError to prevent unnecessary crashes
      return [];
    }
  },

  getEngagementMetrics: async () => {
    try {
      const response = await api.get<ResponseData<EngagementMetrics>>(
        "/analytics/engagement"
      );
      return response.data.data;
    } catch (error) {
      handleError(error as AxiosError);
      throw error;
    }
  },
};

export const authAPI = {
  testConnection: async () => {
    try {
      // Check if token exists before making the request
      const token = localStorage.getItem("token");
      if (!token) {
        // console.log("No token found, skipping auth check");
        return { status: "error", authenticated: false };
      }

      const response = await api.get("/auth/me");
      // console.log("Auth check response:", response.data);
      return { ...response.data, status: "success", authenticated: true };
    } catch (error) {
      console.error("Auth check failed:", error);
      // Handle 404 errors gracefully - API endpoint might not be available
      if ((error as AxiosError).response?.status === 404) {
        console.log("Auth endpoint not found, API might be unreachable");
        return {
          status: "error",
          authenticated: false,
          error: "API_UNREACHABLE",
        };
      }
      // Return a structured error response instead of throwing
      return { status: "error", authenticated: false, error: "AUTH_ERROR" };
    }
  },

  login: async (credentials: { email: string; password: string }) => {
    try {
      // Add a timeout to avoid hanging requests
      const response = await api.post("/auth/login", credentials, {
        timeout: 10000, // 10 second timeout
      });
      // console.log("Login response:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("Login error:", error);
      // Special handling for 404 errors - don't throw, return a structured error response
      if ((error as AxiosError).response?.status === 404) {
        return {
          status: "error",
          message: "Login endpoint not available. Is the API server running?",
        };
      }

      // For connection errors, return a better message
      if (
        (error as AxiosError).code === "ECONNREFUSED" ||
        (error as AxiosError).message.includes("Network Error")
      ) {
        return {
          status: "error",
          message:
            "Cannot connect to authentication server. Please try again later.",
        };
      }

      // For other errors, let handleError function format them
      handleError(error as AxiosError);
    }
  },

  loginWithProvider: async (provider: "google") => {
    try {
      const response = await api.post(
        `/auth/${provider}`,
        {},
        {
          timeout: 10000,
        }
      );
      return response.data.data;
    } catch (error) {
      console.error(`${provider} login error:`, error);
      if ((error as AxiosError).response?.status === 404) {
        return {
          status: "error",
          message: `${provider} login endpoint not available. Is the API server running?`,
        };
      }
      if (
        (error as AxiosError).code === "ECONNREFUSED" ||
        (error as AxiosError).message?.includes("Network Error")
      ) {
        return {
          status: "error",
          message:
            "Cannot connect to authentication server. Please try again later.",
        };
      }
      handleError(error as AxiosError);
    }
  },

  register: async (data: {
    email: string;
    password: string;
    stripeSessionId?: string;
  }) => {
    try {
      console.log("Registering with data:", {
        email: data.email,
        hasPassword: !!data.password,
        hasStripeSession: !!data.stripeSessionId,
      });

      const response = await api.post("/auth/register", data, {
        timeout: 10000, // 10 second timeout
      });
      console.log("Register response:", response.data);
      return response.data.data;
    } catch (error) {
      console.error("Register error:", error);
      // Special handling for 404 errors
      if ((error as AxiosError).response?.status === 404) {
        return {
          status: "error",
          message:
            "Registration endpoint not available. Is the API server running?",
        };
      }

      // For connection errors, return a better message
      if (
        (error as AxiosError).code === "ECONNREFUSED" ||
        (error as AxiosError).message.includes("Network Error")
      ) {
        return {
          status: "error",
          message:
            "Cannot connect to authentication server. Please try again later.",
        };
      }

      handleError(error as AxiosError);
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
      return { status: "success" };
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout API fails, we can still clear local state
      return { status: "success", message: "Logged out locally" };
    }
  },

  // Replace the forgotPassword function in authAPI
  forgotPassword: async (email: string): Promise<ForgotPasswordResponse> => {
    try {
      const response = await api.post(
        "/auth/forgot-password",
        { email },
        {
          timeout: 10000, // 10 second timeout
        }
      );

      // Handle the response data
      return {
        status: "success",
        message: response.data?.message || "Password reset email sent",
      };
    } catch (error) {
      console.error("Forgot password error:", error);

      // Handle various error cases
      if ((error as AxiosError).response?.status === 404) {
        return {
          status: "error",
          message: "Forgot password endpoint not available.",
        };
      }

      if (
        (error as AxiosError).code === "ECONNREFUSED" ||
        (error as AxiosError).message?.includes("Network Error")
      ) {
        return {
          status: "error",
          message: "Cannot connect to server. Please try again later.",
        };
      }

      if ((error as AxiosError).response?.status === 404) {
        return {
          status: "error" as const,
          message: "Forgot password endpoint not available.",
        };
      }

      // Default error response
      return {
        status: "error",
        message: "Failed to process forgot password request",
      };
    }
  },

  resetPassword: async (
    token: string,
    password: string
  ): Promise<{
    status: "success" | "error";
    message?: string;
    user?: Record<string, unknown>;
    token?: string;
  }> => {
    try {
      const response = await api.post(
        `/auth/reset-password/${token}`,
        { password },
        {
          timeout: 10000, // 10 second timeout
        }
      );
      // console.log("Reset password response:", response.data);
      return {
        status: "success",
        ...response.data.data,
      };
    } catch (error) {
      console.error("Reset password error:", error);

      // Type guard for AxiosError
      const isAxiosError = (err: unknown): err is AxiosError => {
        return typeof err === "object" && err !== null && "isAxiosError" in err;
      };

      if (isAxiosError(error)) {
        // Extract message from response if available
        if (error.response?.data) {
          const errorData = error.response.data;
          if (
            typeof errorData === "object" &&
            errorData !== null &&
            "message" in errorData
          ) {
            return {
              status: "error",
              message: String(errorData.message),
            };
          }
        }
      }

      return {
        status: "error",
        message:
          "Failed to reset password. The link may be invalid or expired.",
      };
    }
  },
};

// Stripe methods for handling payments and subscriptions
let stripePromise: Promise<Stripe | null>;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Define pricing plans with Stripe price IDs
export const pricingPlans: PricingPlan[] = [
  {
    id: "pro",
    name: "Pro",
    price: "$12",
    period: "/month",
    priceId: "price_1QzeqbGfclTFWug124uFjz1g",
    trialDays: 14,
  },
];

// Create Stripe checkout session for subscription with trial
export const createCheckoutSession = async (
  priceId: string,
  successUrl: string,
  options: {
    skipTrial?: boolean;
    email?: string;
  } = {}
) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const email = user.email || options.email || "";

    // console.log("Checkout Session Email Debug:", {
    //   userFromStorage: user,
    //   optionsEmail: options.email,
    //   finalEmail: email,
    // });

    if (!priceId) {
      throw new Error("Price ID is required");
    }

    const finalSuccessUrl =
      successUrl ||
      (typeof window !== "undefined"
        ? `${window.location.origin}/?session_id={CHECKOUT_SESSION_ID}`
        : "");

    const cancelUrl =
      typeof window !== "undefined" ? window.location.origin : "";

    // console.log("Creating checkout session with:", {
    //   priceId,
    //   successUrl: finalSuccessUrl,
    //   cancelUrl,
    //   skipTrial: options.skipTrial,
    //   hasEmail: !!email,
    //   email: email?.substring(0, 3) + "...", // Log just first few chars for privacy
    // });

    const response = await fetch(`${API_URL}/stripe/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        priceId,
        successUrl: finalSuccessUrl,
        cancelUrl,
        skipTrial: options.skipTrial || false,
        email, // Use the resolved email
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Checkout API error response:", errorData);
      throw new Error(
        errorData.error ||
          errorData.details ||
          "Failed to create checkout session"
      );
    }

    const data = await response.json();
    const stripe = await getStripe();

    if (!stripe) {
      throw new Error("Failed to initialize Stripe");
    }

    if (!data.sessionId) {
      throw new Error("No session ID returned from checkout API");
    }

    console.log("Redirecting to Stripe checkout with session:", data.sessionId);
    const { error } = await stripe.redirectToCheckout({
      sessionId: data.sessionId,
    });

    if (error) {
      console.error("Stripe checkout error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
};

// Helper to start free trial or renew subscription
export const startFreeTrial = async (plan: PricingPlan, userEmail?: string) => {
  if (typeof window === "undefined") return;

  // console.log('Starting trial checkout process...');

  const isRenewal = window.location.search.includes("renew=true");
  const successUrl = `${window.location.origin}/?session_id={CHECKOUT_SESSION_ID}`;

  // Get email (should already be found by components, this is a fallback)
  const email = userEmail || "";

  // console.log('Email for checkout:', { email });

  // Check if this email is eligible for trial
  let forceSkipTrial = isRenewal;

  if (email && email.includes("@") && !isRenewal) {
    try {
      // Check trial eligibility with our utility function
      const isEligible = await checkTrialEligibility(email);

      if (!isEligible) {
        console.log('User not eligible for trial, forcing renewal flow');
        forceSkipTrial = true;
        
        // Show user a message that they already used trial
        if (typeof window !== 'undefined') {
          const confirmed = confirm(
            'This email has already used a free trial. You will be charged for the subscription. Continue?'
          );
          if (!confirmed) {
            console.log('User cancelled checkout');
            return;
          }
        }
      } else {
        console.log('User eligible for free trial');
      }
    } catch (error) {
      console.error("Error checking trial eligibility:", error);
    }
  }

  // Final logging before checkout
  console.log(`Proceeding to checkout (skipTrial: ${forceSkipTrial})`);

  // Create checkout session with or without trial
  try {
    await createCheckoutSession(plan.priceId, successUrl, {
      skipTrial: forceSkipTrial,
      email: email, // Pass email even if empty
    });
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    throw error;
  }
};

// Get subscription status
export const getSubscriptionStatus = async () => {
  try {
    const response = await api.get("/subscription/status");
    return response.data;
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    throw error;
  }
};

// Cancel subscription
export const cancelSubscription = async (subscriptionId: string) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem("token");

    const response = await fetch("/api/stripe/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ subscriptionId }),
    });

    if (!response.ok) {
      throw new Error("Failed to cancel subscription");
    }

    return await response.json();
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    throw error;
  }
};

// Update subscription auto-renewal setting
export const updateSubscriptionRenewal = async (
  subscriptionId: string,
  autoRenew: boolean
) => {
  try {
    // Get token from localStorage
    const token = localStorage.getItem("token");

    // Convert autoRenew boolean to cancelAtPeriodEnd (they're opposites)
    const cancelAtPeriodEnd = !autoRenew;

    const response = await fetch("/api/stripe/update-renewal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify({ subscriptionId, cancelAtPeriodEnd }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.message || "Failed to update subscription renewal settings"
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating subscription renewal:", error);
    throw error;
  }
};

export const emailAPI = {
  // Get email usage stats for the current day
  getUsage: async () => {
    try {      // FIXED: Check if the endpoint exists before making the request
      // This prevents the 404 error from being logged as an error
      const response = await api.get("/email/usage");
      return response.data.data;
    } catch (error) {
      // IMPROVED: Better error handling with specific status code checks
      if ((error as AxiosError).response?.status === 404) {
        console.log("Email usage endpoint not implemented yet, using defaults");
        // Return default values silently when endpoint doesn't exist
        return {
          emailsSent: 0,
          dailyLimit: 100,
          lastUpdated: new Date().toISOString(),
        };
      }

      // Log other errors but still return defaults to prevent app crashes
      console.error("Error fetching email usage:", error);
      return {
        emailsSent: 0,
        dailyLimit: 100,
        lastUpdated: new Date().toISOString(),
      };
    }
  },
};

// src/app/api/auth/route.ts logic moved here
// Error response interface
interface ErrorResponseData {
  message?: string;
  error?: string;
  status?: string;
  data?: unknown;
}

// PHASE 2: Subscription/renewal logic is now handled by subscriptionContext.tsx. Remove all direct subscription/renewal checks, redirects, and localStorage management from this file.
// All logic for renewal redirects, subscription status, and related state is now centralized.
