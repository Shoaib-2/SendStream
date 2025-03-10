'use client'
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SubscriptionErrorHandler = () => {
  const router = useRouter();

  useEffect(() => {
    // Listen for 403 errors
    const handleErrors = (event: ErrorEvent) => {
      if (event.error && event.error.message && 
          (event.error.message.includes('Subscription expired') || 
           event.error.message.includes('Subscription required'))) {
        console.log('Subscription error detected, redirecting to pricing');
        
        // Set a flag to prevent multiple redirects
        if (!sessionStorage.getItem('redirecting_to_pricing')) {
          sessionStorage.setItem('redirecting_to_pricing', 'true');
          
          // Use timeout to avoid navigation during render
          setTimeout(() => {
            router.push('/pricing');
            // Clear flag after redirect
            setTimeout(() => {
              sessionStorage.removeItem('redirecting_to_pricing');
            }, 1000);
          }, 100);
        }
      }
    };

    // Add global error handler
    window.addEventListener('error', handleErrors);
    
    return () => {
      window.removeEventListener('error', handleErrors);
    };
  }, [router]);

  return null;
};

export default SubscriptionErrorHandler;