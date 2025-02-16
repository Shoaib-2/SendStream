// src/context/DataContext.tsx
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Subscriber, Newsletter } from '@/types';
import { subscriberAPI, newsletterAPI, APIError } from '@/services/api';

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


  useEffect(() => {
    let isSubscribed = true;
    let redirecting = false;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [subscribersData, newslettersData] = await Promise.all([
          subscriberAPI.getAll(),
          newsletterAPI.getAll()
        ]);

        if (subscribersData && isSubscribed) {
          const formattedSubscribers: Subscriber[] = subscribersData.map(sub => ({
            id: sub.id || sub._id || '',
            email: sub.email,
            name: sub.name,
            status: sub.status,
            subscribed: sub.subscribedDate || sub.subscribed
          }));
          setSubscribers(formattedSubscribers);
        }

        if (newslettersData && isSubscribed) {
          setNewsletters(newslettersData);
        }
      } catch (error) {
        if (error instanceof APIError && error.status === 401 && !redirecting) {
          redirecting = true;
          localStorage.removeItem('token');
          setSubscribers([]);
          setNewsletters([]);
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    if (!localStorage.getItem('token')) {
      setSubscribers([]);
      setNewsletters([]);
    } else if (typeof window !== 'undefined') {
      fetchData();
    }
    
    return () => { isSubscribed = false; };
  }, []);

  
  const addSubscriber = async (subscriberData: Omit<Subscriber, 'id'>) => {
    try {
      const response = await subscriberAPI.create(subscriberData);
      
      if (response) {
        const newSubscriber: Subscriber = {
          id: response.id || response._id || String(new Date().getTime()),
          email: response.email,
          name: response.name,
          status: response.status,
          subscribed: response.subscribed || new Date().toISOString()
        };
        
        setSubscribers(prev => [...prev, newSubscriber]);
      }
    } catch (error) {
      console.error('Error adding subscriber:', error);
      throw error;
    }
  };

  const removeSubscriber = async (id: string) => {
    try {
      if (!id) {
        throw new Error('Subscriber ID is required');
      }

      const cleanId = String(id).trim();
      await subscriberAPI.delete(cleanId);
      
      // Fetch fresh data after deletion
      const updatedData = await subscriberAPI.getAll();
      if (updatedData) {
        const updatedSubscribers: Subscriber[] = updatedData.map(sub => ({
          id: sub.id,
          email: sub.email,
          name: sub.name,
          status: sub.status,
          subscribed: sub.subscribedDate || sub.subscribed
        }));
        setSubscribers(updatedSubscribers);
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