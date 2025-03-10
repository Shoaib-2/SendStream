import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle } from 'lucide-react';

const ExpiredSubscription = () => {
  const router = useRouter();

  // Auto-redirect after a short delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/?renew=true');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl max-w-md
        border border-gray-700 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-16 h-16 text-amber-500" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Subscription Expired</h1>
        
        <p className="text-gray-300 mb-6">
          Your subscription has expired. Redirecting to renew your subscription...
        </p>
        
        <button
          onClick={() => router.push('/?renew=true')}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg
            transition-all duration-300 flex items-center justify-center gap-2 w-full"
        >
          <CheckCircle className="w-4 h-4" />
          Renew Now
        </button>
      </div>
    </div>
  );
};

export default ExpiredSubscription;