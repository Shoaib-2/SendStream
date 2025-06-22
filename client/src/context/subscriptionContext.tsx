// -----------------------------
// Subscription Context (Centralized Subscription/Renewal Logic)
//
// This context centralizes all logic for checking subscription status, handling renewal, and managing related redirects.
// It replaces scattered logic from ExpiredSubscription.tsx, SubscriptionErrorHandler.tsx, dataContext.tsx, authContext.tsx, and api.ts.
//
// Usage:
//   import { SubscriptionProvider, useSubscription } from '@/context/subscriptionContext';
//
//   <SubscriptionProvider>...</SubscriptionProvider>
//   const { status, isRenewalRequired, triggerRenewalRedirect, returnPath, loading, error } = useSubscription();
//
// PHASE 2: CENTRALIZATION
// - All subscription/renewal logic is now managed here.
// - Components should use this context/hook instead of duplicating logic.
// - This enables a single source of truth and prevents race conditions or duplicate redirects.
// -----------------------------

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSubscriptionStatus } from '@/services/api';

// Subscription status state machine
export enum SubscriptionStatus {
  UNKNOWN = 'UNKNOWN',
  ACTIVE = 'ACTIVE',
  TRIAL = 'TRIAL',
  EXPIRED = 'EXPIRED',
  GRACE = 'GRACE',
  CHECKING = 'CHECKING',
}

interface SubscriptionContextType {
  status: SubscriptionStatus;
  isRenewalRequired: boolean;
  triggerRenewalRedirect: () => void;
  returnPath: string | null;
  loading: boolean;
  error: string | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<SubscriptionStatus>(SubscriptionStatus.CHECKING);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState<string | null>(null);

  // Centralized subscription check
  const checkSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Only check subscription if user is authenticated (token exists)
      if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
        setStatus(SubscriptionStatus.UNKNOWN);
        setLoading(false);
        return;
      }
      const result = await getSubscriptionStatus();
      // Example: result.data?.subscription?.status
      const sub = result?.data?.subscription;
      if (!sub) {
        setStatus(SubscriptionStatus.EXPIRED);
        return;
      }
      if (sub.status === 'active') {
        setStatus(SubscriptionStatus.ACTIVE);
      } else if (sub.status === 'trialing') {
        setStatus(SubscriptionStatus.TRIAL);
      } else if (sub.status === 'canceled' && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date()) {
        setStatus(SubscriptionStatus.GRACE);
      } else {
        setStatus(SubscriptionStatus.EXPIRED);
      }
    } catch (err) {
      // Suppress error if user is not authenticated
      if (typeof window !== 'undefined' && !localStorage.getItem('token')) {
        setStatus(SubscriptionStatus.UNKNOWN);
        setError(null);
      } else {
        setError('Failed to check subscription');
        setStatus(SubscriptionStatus.UNKNOWN);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount, check subscription
  useEffect(() => {
    checkSubscription();
    // Restore return path if present
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('returnPath');
      if (stored) setReturnPath(stored);
    }
  }, [checkSubscription]);

  // Centralized renewal redirect
  const triggerRenewalRedirect = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Store current path for post-renewal navigation
      if (!localStorage.getItem('returnPath')) {
        localStorage.setItem('returnPath', window.location.pathname);
      }
      window.location.href = '/?renew=true';
    }
  }, []);

  // Determine if renewal is required
  const isRenewalRequired = status === SubscriptionStatus.EXPIRED;

  return (
    <SubscriptionContext.Provider value={{
      status,
      isRenewalRequired,
      triggerRenewalRedirect,
      returnPath,
      loading,
      error,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextType => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider');
  return context;
};
