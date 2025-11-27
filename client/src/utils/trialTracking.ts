/**
 * Utilities for tracking trial usage to prevent multiple trials with the same email.
 */

// Interface for the trial history object stored in localStorage
interface TrialHistory {
    emails: Record<string, string>; // email -> timestamp
    lastEmail?: string;
    lastAttempt?: string;
    lastSkipTrial?: boolean;
    hasStripeCustomer?: boolean;
    hasStripeSubscription?: boolean;
    backendDenied?: boolean;
  }
  
  /**
   * Record an email in trial history
   */
  export const recordTrialAttempt = (email: string): void => {
    if (!email || !email.includes('@')) return;
    
    try {
      const now = new Date().toISOString();
      const history = getTrialHistory();
      
      history.lastEmail = email;
      history.lastAttempt = now;
      
      if (!history.emails) {
        history.emails = {};
      }
      
      history.emails[email] = now;
      
      localStorage.setItem('trial_history', JSON.stringify(history));
    } catch {
    }
  };
  
  /**
   * Check if an email has been recorded in trial history
   */
  export const hasTrialHistory = (email: string): boolean => {
    if (!email || !email.includes('@')) return false;
    
    try {
      const history = getTrialHistory();
      return !!(history.emails && history.emails[email]);
    } catch {
      return false;
    }
  };
  
  /**
   * Get the trial history from localStorage
   */
  export const getTrialHistory = (): TrialHistory => {
    try {
      const historyString = localStorage.getItem('trial_history');
      if (historyString) {
        return JSON.parse(historyString);
      }
    } catch {
    }
    
    return { emails: {} };
  };
  
  /**
   * Find any email in localStorage/cookies/URL
   */
  export const findUserEmail = (): string => {
    let email = '';
    
    try {
      // Check URL parameters
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const urlEmail = urlParams.get('email');
        if (urlEmail && urlEmail.includes('@')) {
          email = urlEmail;
        }
      }
      
      // Check localStorage with fallbacks
      if (!email) {
        const sources = [
          localStorage.getItem('checkout_email'),
          localStorage.getItem('user_email'),
          localStorage.getItem('email'),
        ];
        
        for (const source of sources) {
          if (source && source.includes('@')) {
            email = source;
            break;
          }
        }
      }
      
      // Check user object
      if (!email) {
        const userString = localStorage.getItem('user');
        if (userString) {
          const user = JSON.parse(userString);
          if (user && user.email && user.email.includes('@')) {
            email = user.email;
          }
        }
      }
      
      // Check trial history
      if (!email) {
        const history = getTrialHistory();
        if (history.lastEmail && history.lastEmail.includes('@')) {
          email = history.lastEmail;
        }
      }
    } catch {
    }
    
    return email;
  };
  
  /**
   * Check if a user is eligible for trial based on email
   */
  export const checkTrialEligibility = async (email: string): Promise<boolean> => {
    if (!email || !email.includes('@')) return true;
    
    // First check local history
    if (hasTrialHistory(email)) {
      return false;
    }
    
    try {
      // Also check local storage for this email
      const allStorageKeys = Object.keys(localStorage);
      for (const key of allStorageKeys) {
        const value = localStorage.getItem(key);
        if (value && value.includes(email)) {
          recordTrialAttempt(email);
          return false;
        }
      }
      
      // Check with backend API
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://backend-9h3q.onrender.com/api';
      const response = await fetch(`${API_URL}/admin/check-trial-eligibility?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        
        // Record result in history
        if (data.status === 'success' && !data.eligible) {
          recordTrialAttempt(email);
        }
        
        return data.status === 'success' && data.eligible;
      }
    } catch {
    }
    
    return true;
  };