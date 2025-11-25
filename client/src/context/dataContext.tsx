// -----------------------------
// Data Context Subscription Logic
//
// This context manages global app data, including subscribers and newsletters.
// It also contains logic for checking subscription status and redirecting to the renewal page (/?renew=true).
//
// PHASE 1 AUDIT & CLEANUP:
// - This file is one of several that handle renewal logic. See also: ExpiredSubscription.tsx, SubscriptionErrorHandler.tsx, authContext.tsx, api.ts.
// - TODO: In a future phase, centralize all subscription/renewal logic in a single context or hook to avoid duplication and race conditions.
//
// Current logic:
// - Checks subscription status before fetching data and may redirect to renewal page if expired.
// - Stores a return path in localStorage for post-renewal navigation.
// - May duplicate logic found in other files/components.
//
// If you are refactoring subscription logic, coordinate with other files that handle renewal.
// -----------------------------
// src/context/DataContext.tsx
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Subscriber, Newsletter } from '@/types';
import { subscriberAPI, newsletterAPI } from '@/services/api';
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

        socket.onerror = () => {
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
  }, [MAX_FETCH_ATTEMPTS, ws]); 

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
  }, [ws]); // Add ws as dependency for cleanup

// Updated useEffect for fetching data in dataContext.tsx
useEffect(() => {
  let isSubscribed = true;
  // PHASE 2: Remove all subscription/renewal checks and redirects from this effect. Use subscriptionContext.tsx instead.
  // The following logic is deprecated:
  // - getSubscriptionStatus
  // - redirect to /?renew=true
  // - localStorage.setItem('returnPath', ...)
  // - subscriptionActive logic
  //
  // Only fetch data. Subscription/renewal state is now managed globally.
  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setSubscribers([]);
      setNewsletters([]);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      // Only fetch data, do not check subscription/renewal here
      let subscribersData: Subscriber[] = [];
      let newslettersData: Newsletter[] = [];
      try {
        const response = await subscriberAPI.getAll();
        if (response) subscribersData = response;
      } catch (err) {
        console.error('Error fetching subscribers:', err);
      }
      try {
        const response = await newsletterAPI.getAll();
        if (response) newslettersData = response;
      } catch (err) {
        console.error('Error fetching newsletters:', err);
      }
      if (subscribersData && isSubscribed) {
        setSubscribers(subscribersData);
      } else {
        setSubscribers([]);
      }
      if (newslettersData && isSubscribed) {
        setNewsletters(newslettersData);
      } else {
        setNewsletters([]);
      }
    } catch (error) {
      console.error('Data fetch error:', error);
    } finally {
      if (isSubscribed) {
        setIsLoading(false);
      }
    }
  };
  fetchData();
  return () => {
    isSubscribed = false;
  };
}, [user]);

  const addSubscriber = async (subscriberData: Omit<Subscriber, 'id'>) => {
    try {
      // Convert Date to string if present
      const payload = {
        ...subscriberData,
        subscribed: subscriberData.subscribed instanceof Date 
          ? subscriberData.subscribed.toISOString() 
          : subscriberData.subscribed
      };
      
      const response = await subscriberAPI.create(payload);

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
      // Convert Date fields to strings if present
      const payload = {
        ...newsletter,
        scheduledDate: newsletter.scheduledDate instanceof Date
          ? newsletter.scheduledDate.toISOString()
          : newsletter.scheduledDate,
        sentDate: newsletter.sentDate instanceof Date
          ? newsletter.sentDate.toISOString()
          : newsletter.sentDate
      };
      
      const response = await newsletterAPI.create(payload);
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
      // Convert Date fields to strings if present
      const payload = {
        ...data,
        scheduledDate: data.scheduledDate instanceof Date
          ? data.scheduledDate.toISOString()
          : data.scheduledDate,
        sentDate: data.sentDate instanceof Date
          ? data.sentDate.toISOString()
          : data.sentDate
      };
      
      const response = await newsletterAPI.update(id, payload);
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

// PHASE 2: Subscription/renewal logic is now handled by subscriptionContext.tsx. Remove any direct subscription checks/redirects from this context.
// All subscription/renewal checks and redirects below are deprecated and should be removed in favor of the centralized context.