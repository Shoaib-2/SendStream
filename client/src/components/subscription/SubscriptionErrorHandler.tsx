'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SubscriptionErrorHandler = () => {
  const router = useRouter();
  
  useEffect(() => {
    // Check for "renew=true" in URL
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
    
    // Initial check
    checkUrl();
    
    // Listen for route changes
    window.addEventListener('popstate', checkUrl);
    
    // Listen for subscription errors with special handling for paid period
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
        
        // Don't redirect if "paid period" message exists in console logs
        const recentLogs = (window as any)._recentLogs || [];
        const hasPaidPeriodLog = recentLogs.some((log: string) => 
          log.includes('paid period') || log.includes('active access'));
        
        if (hasPaidPeriodLog) {
          console.log('User has paid period access, preventing redirect');
          localStorage.setItem('has_active_access', 'true');
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        
        console.log('Subscription error detected, redirecting to home with renew param');
        
        // Set a flag to prevent multiple redirects
        if (!sessionStorage.getItem('redirecting_for_renewal')) {
          sessionStorage.setItem('redirecting_for_renewal', 'true');
          
          // Store current path for return after renewal
          localStorage.setItem('returnPath', window.location.pathname);
          
          // Use timeout to avoid navigation during render
          setTimeout(() => {
            router.push('/?renew=true');
            // Clear flag after redirect
            setTimeout(() => {
              sessionStorage.removeItem('redirecting_for_renewal');
            }, 1000);
          }, 100);
        }
      }
    };

    // Track console logs for "paid period" detection
    const originalConsoleLog = console.log;
    (window as any)._recentLogs = [];
    console.log = function(...args) {
      const logString = args.join(' ');
      (window as any)._recentLogs.push(logString);
      
      // Maintain only last 20 logs
      if ((window as any)._recentLogs.length > 20) {
        (window as any)._recentLogs.shift();
      }
      
      // Check for paid period messages
      if (logString.includes('paid period') || logString.includes('has active access')) {
        localStorage.setItem('has_active_access', 'true');
      }
      
      return originalConsoleLog.apply(console, args);
    };

    // Add global error handler
    window.addEventListener('error', handleErrors);
    
    return () => {
      window.removeEventListener('error', handleErrors);
      window.removeEventListener('popstate', checkUrl);
      console.log = originalConsoleLog;
    };
  }, [router]);

  return null;
};

export default SubscriptionErrorHandler;