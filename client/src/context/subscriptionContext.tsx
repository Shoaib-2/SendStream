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

const logger = {
  info: (msg: string, data?: unknown) => console.log(`[SubscriptionContext] ${msg}`, data || ''),
  warn: (msg: string) => console.warn(`[SubscriptionContext] ${msg}`),
  error: (msg: string, err?: unknown) => console.error(`[SubscriptionContext] ${msg}`, err)
};

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
  const [redirectAttempted, setRedirectAttempted] = useState(false);

  // Centralized renewal redirect (defined first to avoid dependency issues)
  const triggerRenewalRedirect = useCallback(() => {
    if (typeof window !== 'undefined') {
      // Prevent redirect loops
      if (redirectAttempted) {
        logger.warn('Redirect already attempted, preventing loop');
        return;
      }
      
      // Store current path for post-renewal navigation
      if (!localStorage.getItem('returnPath')) {
        localStorage.setItem('returnPath', window.location.pathname);
      }
      setRedirectAttempted(true);
      window.location.href = '/?renew=true';
    }
  }, [redirectAttempted]);

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
      
      // Check if user just renewed - if so, give the system time to update
      const justRenewed = localStorage.getItem('subscription_renewed') === 'true';
      const sessionId = localStorage.getItem('stripe_session_id');
      
      if (justRenewed || sessionId) {
        logger.info('User just renewed, skipping subscription check for now');
        // Clear the flags after a delay
        setTimeout(() => {
          localStorage.removeItem('subscription_renewed');
          localStorage.removeItem('stripe_session_id');
        }, 5000);
        // Assume active for now - will be verified on next check
        setStatus(SubscriptionStatus.ACTIVE);
        setLoading(false);
        return;
      }
      
      // Add cache busting to force fresh data
      const result = await getSubscriptionStatus();
      logger.info('Subscription check result:', result);
      
      const sub = result?.data?.subscription;
      if (!sub) {
        logger.info('No subscription found, status: EXPIRED');
        setStatus(SubscriptionStatus.EXPIRED);
        return;
      }
      
      logger.info('Subscription found:', { status: sub.status, id: sub.id });
      
      if (sub.status === 'active') {
        setStatus(SubscriptionStatus.ACTIVE);
        // Clear any renewal flags since subscription is active
        localStorage.removeItem('subscription_renewed');
        localStorage.removeItem('stripe_session_id');
        localStorage.removeItem('returnPath');
      } else if (sub.status === 'trialing') {
        setStatus(SubscriptionStatus.TRIAL);
      } else if (sub.status === 'canceled' && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) > new Date()) {
        setStatus(SubscriptionStatus.GRACE);
      } else {
        setStatus(SubscriptionStatus.EXPIRED);
      }
    } catch (err) {
      logger.error('Error checking subscription:', err);
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

  // Auto-redirect to renewal page if subscription expired and user is authenticated
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isAuthenticated = !!localStorage.getItem('token');
    const isOnRenewalPage = window.location.search.includes('renew=true');
    const hasSessionId = window.location.search.includes('session_id=');
    const isOnAuthPage = window.location.pathname.includes('/login') || 
                         window.location.pathname.includes('/signup');
    const isOnHomePage = window.location.pathname === '/';
    const justRenewed = localStorage.getItem('subscription_renewed') === 'true';
    
    // Don't redirect if:
    // - User just renewed
    // - On renewal page
    // - Has session_id (came from Stripe checkout)
    // - On auth pages
    // - On home page (where renewal happens)
    // - Already attempted redirect
    // - Still loading
    if (justRenewed || hasSessionId || redirectAttempted) {
      logger.info('Skipping redirect - renewal in progress or recently completed');
      return;
    }
    
    // Only redirect if:
    // 1. User is authenticated
    // 2. Subscription is expired
    // 3. Not already on renewal page
    // 4. Not on auth pages
    // 5. Not on home page
    // 6. Not still loading
    if (isAuthenticated && 
        status === SubscriptionStatus.EXPIRED && 
        !isOnRenewalPage && 
        !isOnAuthPage && 
        !isOnHomePage &&
        !loading) {
      logger.info('Subscription expired, redirecting to renewal page');
      triggerRenewalRedirect();
    }
  }, [status, loading, triggerRenewalRedirect, redirectAttempted]);

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
