import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

const ExpiredSubscription = () => {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isAlreadyOnRenewalPage, setIsAlreadyOnRenewalPage] = useState(false);

  // Check if already on renewal page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isOnRenewalPage = window.location.search.includes('renew=true');
      setIsAlreadyOnRenewalPage(isOnRenewalPage);
      console.log('Already on renewal page:', isOnRenewalPage);
    }
  }, []);

  // Handle redirection based on already stored return path
  const handleRenewClick = useCallback(() => {
    if (!redirecting && !isAlreadyOnRenewalPage) {
      setRedirecting(true);
      
      // Check if there's a stored return path
      const returnPath = localStorage.getItem('returnPath');
      
      // Store current path if not already stored
      if (!returnPath && typeof window !== 'undefined') {
        localStorage.setItem('returnPath', window.location.pathname);
      }
      
      // Use setTimeout to avoid React navigation during render warnings
      setTimeout(() => {
        router.push('/?renew=true');
      }, 0);
    }
  }, [redirecting, isAlreadyOnRenewalPage, router]);

  // Handle automatic redirection - in a separate useEffect to ensure it runs
  useEffect(() => {
    console.log('Countdown effect running, already on renewal page:', isAlreadyOnRenewalPage);
    
    // Skip auto-redirect if already redirecting or already on renewal page
    if (redirecting || isAlreadyOnRenewalPage) {
      return;
    }
    
    console.log('Starting countdown timer from', countdown);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        console.log('Countdown:', prev);
        if (prev <= 1) {
          clearInterval(timer);
          console.log('Countdown finished, redirecting');
          handleRenewClick();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      console.log('Clearing countdown timer');
      clearInterval(timer);
    };
  }, [redirecting, isAlreadyOnRenewalPage, countdown, handleRenewClick]);

  console.log('Rendering ExpiredSubscription, redirecting:', redirecting, 'countdown:', countdown);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl max-w-md
        border border-gray-700 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-16 h-16 text-amber-500" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Subscription Expired</h1>
        
        <p className="text-gray-300 mb-4">
          Your subscription has expired. Please renew to continue using the service.
        </p>
        
        {!redirecting && !isAlreadyOnRenewalPage && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-gray-400 mb-2">
              <span>Redirecting shortly</span>
              <span>{countdown}s</span>
            </div>
            <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {(redirecting || isAlreadyOnRenewalPage) && (
          <div className="flex items-center justify-center gap-2 mb-6 text-gray-400 text-sm">
            {isAlreadyOnRenewalPage ? (
              <span>You&apos;re on the renewal page now</span>
            ) : (
              <>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span>Redirecting to renewal page</span>
              </>
            )}
          </div>
        )}
        
        <button
          onClick={handleRenewClick}
          disabled={redirecting || isAlreadyOnRenewalPage}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg
            transition-all duration-300 flex items-center justify-center gap-2 w-full
            disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isAlreadyOnRenewalPage ? (
            "Select a Plan to Renew"
          ) : redirecting ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Renew Now
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ExpiredSubscription;