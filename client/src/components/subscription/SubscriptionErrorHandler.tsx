'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface SubscriptionStatus {
  status: string;
  trialEndsAt?: string;
  expiresAt?: string;
  isActive: boolean;
}

const SubscriptionErrorHandler = () => {
  const router = useRouter();
  const [checkedSubscription, setCheckedSubscription] = useState(false);

  // Function to check actual subscription status from API
  const checkSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Not authenticated, skipping subscription check');
        return;
      }

      console.log('Fetching subscription status with token');
      const response = await fetch('/api/stripe/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Raw subscription API response:', data);

        // Properly extract the nested subscription data
        return {
          data: data,
          subscription: data?.data?.subscription || null
        };
      } else {
        console.error('Subscription status API returned error:', response.status);
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
    return null;
  };

  // Update the determineAccessStatus function
  const determineAccessStatus = (subData: any) => {
    if (!subData || !subData.subscription) {
      console.log('No valid subscription data found');
      return false;
    }

    const subscription = subData.subscription;

    // Check subscription status - use the actual nested status
    const status = subscription.status;
    const trialEndsAt = subscription.trialEnd ?
      new Date(subscription.trialEnd) :
      null;

    const currentPeriodEnd = subscription.currentPeriodEnd ?
      new Date(subscription.currentPeriodEnd) :
      null;

    const now = new Date();

    // Important: A canceled subscription with future end date is still ACTIVE
    // Add detailed logging
    console.log('Detailed subscription check:', {
      status,
      currentPeriodEnd: currentPeriodEnd?.toISOString(),
      now: now.toISOString(),
      isBeforeEnd: currentPeriodEnd && now < currentPeriodEnd
    });

    const hasActiveSubscription = status === 'active';
    const hasActiveTrialPeriod = status === 'trialing' && trialEndsAt && trialEndsAt > now;
    const hasCanceledButActiveAccess = status === 'canceled' && currentPeriodEnd && now < currentPeriodEnd;

    const hasAccess = hasActiveSubscription || hasActiveTrialPeriod || hasCanceledButActiveAccess;

    if (hasCanceledButActiveAccess) {
      console.log('Subscription is canceled but still active until', currentPeriodEnd?.toISOString());
    }

    return hasAccess;
  };

  // Actively check for expired subscriptions and trigger renewal flow
  const checkForExpiredSubscription = async () => {
    if (localStorage.getItem('force_expired_simulation') === 'true') {
      console.log('Returning forced expired subscription for simulation');
      return {
        data: { status: 'success' },
        subscription: {
          status: 'canceled',
          currentPeriodEnd: '2023-01-01T00:00:00.000Z'
        }
      };
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      console.log('Fetching subscription status with token');
      // Skip if currently redirecting
      if (sessionStorage.getItem('redirecting_for_renewal')) {
        return;
      }

      const subscriptionData = await checkSubscriptionStatus();
      const hasAccess = determineAccessStatus(subscriptionData);

      if (!hasAccess) {
        console.log('Subscription access check failed, triggering renewal flow');

        // Remove active access flag
        localStorage.removeItem('has_active_access');

        // Set flag to prevent multiple redirects
        sessionStorage.setItem('redirecting_for_renewal', 'true');

        // Store current path for return after renewal
        localStorage.setItem('returnPath', window.location.pathname);

        // Redirect to renewal page
        setTimeout(() => {
          router.push('/?renew=true');
          // Clear flag after redirect
          setTimeout(() => {
            sessionStorage.removeItem('redirecting_for_renewal');
          }, 1000);
        }, 100);
      } else {
        // Update access flag if we have active access
        localStorage.setItem('has_active_access', 'true');
      }
    } catch (error) {
      console.error('Error checking expired subscription:', error);
    }
  };

  useEffect(() => {
    // Check subscription status on mount
    const verifySubscription = async () => {
      // Only check once per session
      if (checkedSubscription) return;
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Not authenticated, skipping initial subscription check');
        return;
      }

      const subscriptionData = await checkSubscriptionStatus();
      const hasAccess = determineAccessStatus(subscriptionData);

      // Set local storage based on real subscription data
      if (hasAccess) {
        localStorage.setItem('has_active_access', 'true');
        console.log('User has active subscription access');
      } else {
        // Clear access flag if no active access
        localStorage.removeItem('has_active_access');
        console.log('User does not have active subscription access');

        // Trigger renewal flow immediately if needed
        // and not already on the renewal page
        if (!window.location.href.includes('renew=true')) {
          checkForExpiredSubscription();
        }
      }

      setCheckedSubscription(true);
    };

    verifySubscription();

    // Periodically check subscription status
    const intervalCheck = setInterval(() => {
      // Don't check while on the renewal page
      if (!window.location.href.includes('renew=true')) {
        checkForExpiredSubscription();
      }
    }, 60000); // Check every minute

    // Check URL parameters for renewal flow
    const checkUrl = () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('renew') === 'true') {
        // Check if user already has access
        const hasAccess = localStorage.getItem('has_active_access') === 'true';

        if (hasAccess) {
          // Clear URL parameter
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);

          // Redirect to dashboard if on home page
          if (window.location.pathname === '/') {
            console.log('User has active access, redirecting to dashboard');
            router.push('/dashboard');
          }
        }
      }
    };

    // Initial URL check
    setTimeout(() => {
      checkUrl();
    }, 1000); // 1 second delay

    // Listen for route changes
    window.addEventListener('popstate', checkUrl);

    // Listen for subscription errors
    const handleErrors = (event: ErrorEvent) => {
      // Skip if user has active access
      if (localStorage.getItem('has_active_access') === 'true') {
        console.log('Ignoring subscription error - user has active access');
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.error && event.error.message &&
        (event.error.message.includes('Subscription expired') ||
          event.error.message.includes('Subscription required'))) {

        // Verify access status before redirecting
        checkSubscriptionStatus().then(data => {
          const hasAccess = determineAccessStatus(data);

          if (hasAccess) {
            console.log('Verified active subscription, preventing redirect');
            localStorage.setItem('has_active_access', 'true');
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          // No active access, trigger renewal flow
          console.log('Subscription verification confirmed no active access, redirecting to renewal');
          checkForExpiredSubscription();
        });
      }
    };

    // Add global error handler
    window.addEventListener('error', handleErrors);

    // functions for testing renewal flow
    if (typeof window !== 'undefined') {
      window.debugSubscription = {
        simulateExpired: () => {
          localStorage.removeItem('has_active_access');
          // Dispatch a custom event to notify components
          window.dispatchEvent(new Event('subscription-changed'));
          window.location.href = "/?renew=true";
        },
        forceSimulateExpired: () => {
          // Set flags to force expired state
          localStorage.removeItem('has_active_access');
          localStorage.setItem('force_expired_simulation', 'true');

          // Notify components
          window.dispatchEvent(new Event('subscription-changed'));
          console.log('Forced expired simulation active');
        },
        checkStatus: async () => {
          const data = await checkSubscriptionStatus();
          console.log("Current subscription data (RAW):", data);
          const hasAccess = determineAccessStatus(data);
          console.log("Has access:", hasAccess);
          return { data, hasAccess };
        },
        logApiCall: async () => {
          try {
            const token = localStorage.getItem('token');
            if (!token) {
              console.log("No token available");
              return null;
            }

            console.log("Calling API directly with:", token.substring(0, 10) + "...");
            const response = await fetch('/api/stripe/status', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            const responseText = await response.text();
            console.log("Raw API response text:", responseText);

            try {
              // Try to parse as JSON
              const jsonData = JSON.parse(responseText);
              console.log("Parsed JSON data:", jsonData);
              console.log("API status path:", jsonData?.data?.subscription?.status);
              console.log("API period end path:", jsonData?.data?.subscription?.currentPeriodEnd);
              return jsonData;
            } catch (e) {
              console.error("Failed to parse response as JSON:", e);
            }

            return { rawText: responseText };
          } catch (error) {
            console.error("Error in direct API call:", error);
            return null;
          }
        },
        resetSimulation: () => {
          localStorage.setItem('has_active_access', 'true');
          localStorage.removeItem('force_expired_simulation'); // Add this line
          sessionStorage.removeItem('redirecting_for_renewal');
          if (window.location.search.includes('renew=true')) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
          console.log('Simulation reset complete');
          
          // Add navigation to dashboard or landing page
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 100);
        }
      };
    }

    return () => {
      clearInterval(intervalCheck);
      window.removeEventListener('error', handleErrors);
      window.removeEventListener('popstate', checkUrl);
    };
  }, [router, checkedSubscription]);
};
// Add TS interface for debug functions
declare global {
  interface Window {
    debugSubscription?: {
      simulateExpired: () => void;
      forceSimulateExpired: () => void;
      checkStatus: () => Promise<{ data: any, hasAccess: boolean | null }>;
      logApiCall: () => Promise<any>;
      resetSimulation: () => void;
    };
  }
}

export default SubscriptionErrorHandler;