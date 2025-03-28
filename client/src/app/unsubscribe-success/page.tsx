"use client";
// src/app/unsubscribe-success/page.tsx
import { useSearchParams } from 'next/navigation';

export default function UnsubscribeSuccessPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50 p-4">
      <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all duration-300 shadow-lg text-center max-w-md w-full">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/50">
          <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold font-inter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Successfully Unsubscribed
        </h1>
        <p className="text-gray-300 mb-6">
          You have been unsubscribed from our newsletter. You won't receive any more emails from us.
        </p>
        <a 
          href="/" 
          className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-medium transform transition-all duration-300 hover:scale-105 inline-block"
        >
          Return to Homepage
        </a>
      </div>
    </div>
  );
}