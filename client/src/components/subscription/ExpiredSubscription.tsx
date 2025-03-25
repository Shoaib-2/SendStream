import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

const ExpiredSubscription = () => {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  // Handle redirection based on already stored return path
  const handleRenewClick = () => {
    if (!redirecting) {
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
  };

  // Handle automatic redirection
  useEffect(() => {
    // Skip auto-redirect if we're already on the renewal page or already redirecting
    if (redirecting || (typeof window !== 'undefined' && window.location.href.includes('renew=true'))) {
      return;
    }
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setRedirecting(true);
          
          // Store return path
          const returnPath = localStorage.getItem('returnPath');
          if (!returnPath) {
            localStorage.setItem('returnPath', window.location.pathname);
          }
          
          // Schedule navigation outside of render cycle
          setTimeout(() => {
            router.push('/?renew=true');
          }, 0);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [redirecting, router]);

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
        
        {!redirecting && (
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
        
        {redirecting && (
          <div className="flex items-center justify-center gap-2 mb-6 text-gray-400 text-sm">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span>Redirecting to renewal page</span>
          </div>
        )}
        
        {/* <button
          onClick={handleRenewClick}
          disabled={redirecting}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg
            transition-all duration-300 flex items-center justify-center gap-2 w-full
            disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {redirecting ? (
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
        </button> */}
      </div>
    </div>
  );
};

export default ExpiredSubscription;