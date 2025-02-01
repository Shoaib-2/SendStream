// src/context/DataContext.tsx
"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Subscriber, Newsletter } from '@/types';

interface DataContextType {
  subscribers: Subscriber[];
  newsletters: Newsletter[];
  addSubscriber: (subscriber: Subscriber) => void;
  removeSubscriber: (id: string) => void;
  addNewsletter: (newsletter: Newsletter) => void;
  updateNewsletter: (id: string, data: Partial<Newsletter>) => void;
}

export const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);

  useEffect(() => {
    // Load initial data
    const loadedSubscribers = localStorage.getItem('subscribers');
    const loadedNewsletters = localStorage.getItem('newsletters');
    
    if (loadedSubscribers) setSubscribers(JSON.parse(loadedSubscribers));
    if (loadedNewsletters) setNewsletters(JSON.parse(loadedNewsletters));
  }, []);

  const addSubscriber = (subscriber: Subscriber) => {
    setSubscribers(prev => {
      const updated = [...prev, subscriber];
      localStorage.setItem('subscribers', JSON.stringify(updated));
      return updated;
    });
  };

  const removeSubscriber = (id: string) => {
    setSubscribers(prev => {
      const updated = prev.filter(s => s.id !== id);
      localStorage.setItem('subscribers', JSON.stringify(updated));
      return updated;
    });
  };

  const addNewsletter = (newsletter: Newsletter) => {
    setNewsletters(prev => {
      const updated = [...prev, newsletter];
      localStorage.setItem('newsletters', JSON.stringify(updated));
      return updated;
    });
  };

  const updateNewsletter = (id: string, data: Partial<Newsletter>) => {
    setNewsletters(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, ...data } : n);
      localStorage.setItem('newsletters', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <DataContext.Provider value={{
      subscribers,
      newsletters,
      addSubscriber,
      removeSubscriber,
      addNewsletter,
      updateNewsletter
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