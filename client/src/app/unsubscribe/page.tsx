"use client";
// src/app/unsubscribe/page.tsx
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function UnsubscribeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const processUnsubscribe = async () => {
      if (token) {
        // Make API call to backend to process the unsubscribe request
        try {          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/subscribers/unsubscribe/${token}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to unsubscribe');
          }

          // After successful unsubscribe, redirect to success page
          router.push(`/unsubscribe-success?token=${token}`);
        } catch (error) {
          console.error('Error unsubscribing:', error);
          setError(true);
          // Still redirect to success page after a delay to prevent broken experience
          setTimeout(() => {
            router.push('/unsubscribe-success');
          }, 4000);
        } finally {
          setLoading(false);
        }
      } else {
        // If no token is provided, still redirect to success page
        router.push('/unsubscribe-success');
      }
    };

    processUnsubscribe();
  }, [token, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50 p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all duration-300 shadow-lg text-center max-w-md w-full">
          <h1 className="text-2xl md:text-3xl font-bold font-inter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Processing Unsubscribe Request
          </h1>
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
          <p className="text-gray-300">
            Please wait while we process your request...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50 p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all duration-300 shadow-lg text-center max-w-md w-full">
          <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/50">
            <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-inter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Processing Your Request
          </h1>
          <p className="text-gray-300 mb-4">
            We encountered an issue processing your unsubscribe request.
          </p>
          <p className="text-gray-400 mb-6">
            Redirecting you to the confirmation page...
          </p>
        </div>
      </div>
    );
  }

  return null;
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50 p-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  );
}