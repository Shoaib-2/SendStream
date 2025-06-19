// src/context/DataContext.tsx
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Subscriber, Newsletter } from '@/types';
import { subscriberAPI, newsletterAPI, getSubscriptionStatus } from '@/services/api';
import { useAuth } from './authContext';

interface DataContextType {
  subscribers: Subscriber[];
  newsletters: Newsletter[];
  addSubscriber: (subscriber: Omit<Subscriber, 'id'>) => Promise<void>;
  removeSubscriber: (id: string) => Promise<void>;
  addNewsletter: (newsletter: Omit<Newsletter, 'id'>) => Promise<void>;
  updateNewsletter: (id: string, data: Partial<Newsletter>) => Promise<void>;
  isLoading: boolean;
}

export const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const MAX_FETCH_ATTEMPTS = 3;
  const { user } = useAuth();

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('token');

    const connectWebSocket = () => {
      if (!token) {
        // console.log('No authentication token found for WebSocket connection');
        return;
      }

      try {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
        // console.log('Attempting WebSocket connection to:', wsUrl);

        const socket = new WebSocket(`${wsUrl}?token=${token}`);

        socket.onopen = () => {
          // console.log('WebSocket connected successfully');
        };

        socket.onmessage = (event: WebSocketEventMap['message']) => {
          try {
            const data = JSON.parse(event.data.toString());
            if (data.type === 'newsletter_update') {
              setNewsletters((prev: Newsletter[]) => prev.map((n: Newsletter) =>
                n.id === data.newsletter._id ? { ...n, ...data.newsletter } : n
              ));
            } else if (data.type === 'subscriber_update') {
              // Update subscribers from WebSocket event
              // console.log('WebSocket subscriber update:', data.data);
              setSubscribers(prev => prev.map(sub =>
                sub.id === data.data.id ? { ...sub, status: data.data.status } : sub
              ));
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };

        socket.onclose = (event: CloseEvent) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          // Only attempt to reconnect if it wasn't closed due to auth failure and we have a token
          if (event.code !== 1008 && localStorage.getItem('token')) {
            // console.log('Attempting to reconnect WebSocket in 3 seconds...');
            setTimeout(connectWebSocket, 3000);
          }
        };

        socket.onerror = (event: Event) => {
          // console.error('WebSocket error:', event); // Commented out to remove build log error
          const currentToken = localStorage.getItem('token');
          if (currentToken !== token) {
            socket.close();
          }
        };

        setWs(socket);
      } catch (error) {
        console.error('Failed to establish WebSocket connection:', error);
      }
    };

    // Connect WebSocket when component mounts or token changes
    if (token) {
      connectWebSocket();
    } else {
      // console.log('No token available for WebSocket connection');
    }

    // Cleanup WebSocket connection on unmount or token change
    return () => {
      if (ws) {
        // console.log('Cleaning up WebSocket connection');
        ws.close();
        setWs(null);
      }
    };
  }, []); // We'll handle token changes in a separate effect

  // Handle token changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (ws) {
          ws.close();
          setWs(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [ws]);

 // Updated useEffect for fetching data in dataContext.tsx
useEffect(() => {
  let isSubscribed = true;
  let redirecting = false;

  const fetchData = async () => {
    // Check if we're in initial page load
    const isInitialLoad = typeof document !== 'undefined' && document.readyState !== 'complete';
    
    // Check for token before attempting to fetch data
    const token = localStorage.getItem('token');
    if (!token) {
      // console.log('No token available, skipping data fetch');
      setSubscribers([]);
      setNewsletters([]);
      setIsLoading(false);
      return;
    }
  
    // Prevent too many fetch attempts
    if (fetchAttempts >= MAX_FETCH_ATTEMPTS) {
      console.error(`Data fetching failed after ${MAX_FETCH_ATTEMPTS} attempts, stopping retries`);
      setIsLoading(false);
      return;
    }
  
    try {
      setIsLoading(true);
      if (!isInitialLoad) {
        // console.log(`Fetching data (attempt ${fetchAttempts + 1})...`);
      }
  
      // Check subscription status first before fetching data
      let subscriptionActive = true;
      try {
        // Use getSubscriptionStatus from API
        const subscriptionStatus = await getSubscriptionStatus();
        if (!subscriptionStatus.data?.hasSubscription) {
          subscriptionActive = false;
          // console.log('No active subscription found');
        } else if (subscriptionStatus.data?.subscription?.status !== 'active' && 
                   subscriptionStatus.data?.subscription?.status !== 'trialing') {
          subscriptionActive = false;
          // console.log(`Subscription status: ${subscriptionStatus.data?.subscription?.status}`);
        }
      } catch (error) {
        // Continue even if subscription check fails
        // console.log('Subscription check error:', error);
      }
      
      // Define properly typed variables with default empty arrays
      let subscribersData: Subscriber[] = [];
      let newslettersData: Newsletter[] = [];
  
      try {
        const response = await subscriberAPI.getAll();
        if (response) subscribersData = response;
        if (!isInitialLoad) {
          // console.log('Subscribers fetched successfully');
        }
      } catch (err) {
        if (
          typeof err === 'object' && err !== null &&
          'status' in err && typeof (err as { status?: number }).status === 'number' &&
          'message' in err && typeof (err as { message?: string }).message === 'string' &&
          (err as { message: string }).message.includes('Subscription expired')
        ) {
          subscriptionActive = false;
        }
        
        if (!isInitialLoad) {
          console.error('Error fetching subscribers:', err);
        }
      }
  
      try {
        const response = await newsletterAPI.getAll();
        if (response) newslettersData = response;
        if (!isInitialLoad) {
          // console.log('Newsletters fetched successfully');
        }
      } catch (err) {
        if (
          typeof err === 'object' && err !== null &&
          'status' in err && typeof (err as { status?: number }).status === 'number' &&
          'message' in err && typeof (err as { message?: string }).message === 'string' &&
          (err as { message: string }).message.includes('Subscription expired')
        ) {
          subscriptionActive = false;
        }
        
        if (!isInitialLoad) {
          console.error('Error fetching newsletters:', err);
        }
      }
  
      if (subscribersData && isSubscribed) {
        // Directly use the subscriber status from the database
        const formattedSubscribers: Subscriber[] = subscribersData.map(sub => ({
          id: sub.id || sub._id || '',
          _id: sub._id,
          email: sub.email,
          name: sub.name,
          status: sub.status,
          subscribed: sub.subscribed || (typeof sub === 'object' && sub !== null && 'subscribedDate' in sub ? (sub as { subscribedDate?: string }).subscribedDate : undefined) || new Date().toISOString(),
          source: sub.source
        }));
  
        setSubscribers(formattedSubscribers);
      } else {
        setSubscribers([]);
      }
  
      if (newslettersData && isSubscribed) {
        setNewsletters(newslettersData);
      } else {
        setNewsletters([]);
      }
      
      // Check if we need to redirect due to inactive subscription
      if (!subscriptionActive && !isInitialLoad && !isOnAuthPage() && !redirecting) {
        // Check if subscription is in paid period
        const subscriptionData = await getSubscriptionStatus();
        const canceledButPaid = subscriptionData?.data?.subscription?.status === 'canceled' && 
                               new Date(subscriptionData?.data?.subscription?.currentPeriodEnd) > new Date();
                               
        if (canceledButPaid) {
          // console.log('Subscription is canceled but still in paid period, allowing access');
          subscriptionActive = true; // Override to allow access
        } else {
          redirecting = true;
          
          // Store return path
          localStorage.setItem('returnPath', window.location.pathname);
          
          // Wait a bit to allow current execution to complete
          setTimeout(() => {
            window.location.href = '/?renew=true';
          }, 100);
        }
      }
  
      // Reset fetch attempts on success
      setFetchAttempts(0);
    } catch (error) {
      if (!isInitialLoad) {
        console.error('Data fetch error:', error);
      }
  
      // Increment fetch attempts
      setFetchAttempts(prevAttempts => prevAttempts + 1);
  
      if (
        typeof error === 'object' && error !== null &&
        'status' in error && (error as { status?: number }).status === 401 && !redirecting
      ) {
        redirecting = true;
        if (!isInitialLoad) {
          // console.log('Authentication error during data fetch, clearing token');
        }
        localStorage.removeItem('token');
        setSubscribers([]);
        setNewsletters([]);
  
        if (typeof window !== 'undefined' && !isOnAuthPage()) {
          window.location.href = '/login';
        }
      } else if (
        typeof error === 'object' && error !== null &&
        'status' in error && (error as { status?: number }).status === 404
      ) {
        if (!isInitialLoad) {
          console.error('API endpoint not found during data fetch. Is the API server running?');
        }
        // Set empty data but don't redirect
        setSubscribers([]);
        setNewsletters([]);
      }
    } finally {
      if (isSubscribed) {
        setIsLoading(false);
      }
    }
  };
  
  // Helper function to check if we're on auth page
  const isOnAuthPage = () => {
    return typeof window !== 'undefined' && 
      (window.location.pathname.includes('/login') || 
       window.location.pathname === '/');
  };
  
  // Call the fetchData function
  fetchData();
  
  // Cleanup function
  return () => {
    isSubscribed = false;
  };
}, [fetchAttempts, user, MAX_FETCH_ATTEMPTS]);

  const addSubscriber = async (subscriberData: Omit<Subscriber, 'id'>) => {
    try {
      const response = await subscriberAPI.create(subscriberData);

      if (response) {
        const newSubscriber: Subscriber = {
          id: response.id || response._id || String(new Date().getTime()),
          _id: response._id,
          email: response.email,
          name: response.name,
          status: response.status,
          subscribed: response.subscribed || new Date().toISOString(),
          source: response.source
        };

        setSubscribers(prev => [...prev, newSubscriber]);
      }
    } catch (error) {
      console.error('Error adding subscriber:', error);
      throw error;
    }
  };

  // Updated to use updateStatus instead of delete and improve error handling
  const removeSubscriber = async (id: string) => {
    try {
      if (!id) {
        throw new Error('Subscriber ID is required');
      }

      const cleanId = String(id).trim();

      // Get the subscriber first to check current status
      const subscriber = subscribers.find(s => s.id === cleanId);
      if (!subscriber) {
        console.warn(`Subscriber with ID ${cleanId} not found in local state`);
      }

      // console.log(`Removing subscriber ${cleanId}, current status: ${subscriber?.status}`);

      // Use updateStatus instead of delete to ensure mailchimp sync
      const updatedSubscriber = await subscriberAPI.updateStatus(cleanId, 'unsubscribed');

      if (updatedSubscriber) {
        // console.log('Subscriber status updated successfully:', updatedSubscriber.status);

        // Update the local state with the new status
        setSubscribers(prev => prev.map(sub =>
          sub.id === cleanId ? { ...sub, status: 'unsubscribed' } : sub
        ));

        // Force sync with mailchimp to ensure consistency
        try {
          // console.log('Syncing with Mailchimp after status update');
          await subscriberAPI.syncMailchimp();
        } catch (syncError) {
          console.error('Mailchimp sync error after status update:', syncError);
          // Continue execution even if sync fails
        }
      } else {
        console.warn('No response received when updating subscriber status');
      }
    } catch (error) {
      console.error('Error in DataContext removeSubscriber:', error);
      throw error;
    }
  };

  const addNewsletter = async (newsletter: Omit<Newsletter, 'id'>) => {
    try {
      const response = await newsletterAPI.create(newsletter);
      if (response) {
        const formattedNewsletter: Newsletter = {
          ...response,
          createdBy: response.createdBy || 'system' // Add default createdBy if missing
        };
        setNewsletters(prev => [...prev, formattedNewsletter]);
      }
    } catch (error) {
      console.error('Error adding newsletter:', error);
      throw error;
    }
  };

  const updateNewsletter = async (id: string, data: Partial<Newsletter>) => {
    try {
      const response = await newsletterAPI.update(id, data);
      if (response) {
        setNewsletters(prev => prev.map(n => n.id === id ? {
          ...response,
          createdBy: response.createdBy || n.createdBy // Preserve createdBy if not in response
        } : n));
      }
    } catch (error) {
      console.error('Error updating newsletter:', error);
      throw error;
    }
  };

  return (
    <DataContext.Provider value={{
      subscribers,
      newsletters,
      addSubscriber,
      removeSubscriber,
      addNewsletter,
      updateNewsletter,
      isLoading
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};