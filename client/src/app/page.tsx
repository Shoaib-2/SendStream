// src/app/page.tsx
'use client'
import Header from '@/components/layout/Header'
import Hero from '@/components/sections/Hero'
import Features from '@/components/sections/Features'
import Pricing from '@/components/sections/Pricing'
import Integration from '@/components/sections/Integration'
import Footer from '@/components/layout/Footer'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import AuthModal from '@/components/auth/authModal'
import { CheckCircle, ArrowRight } from 'lucide-react'

function HomeContent() {
  const searchParams = useSearchParams();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isRenewal, setIsRenewal] = useState(false);
  const [showRenewalSuccess, setShowRenewalSuccess] = useState(false);

  useEffect(() => {
    // Check for URL parameters
    const openAuth = searchParams.get('openAuth');
    const sessionId = searchParams.get('session_id');
    const renew = searchParams.get('renew');
    
    // Set renewal state
    if (renew === 'true') {
      setIsRenewal(true);
    }
    
    // Handle successful Stripe checkout return
    if (sessionId) {
      setShowRenewalSuccess(true);
      setAuthMode('login'); // After renewal, user should log in
      
      // Store session ID for backend verification - use BOTH storage types
      if (typeof window !== 'undefined') {
        // Use sessionStorage as primary (clears on tab close)
        sessionStorage.setItem('stripe_session_id', sessionId);
        sessionStorage.setItem('subscription_renewed', 'true');
        // Also set in localStorage for backup
        localStorage.setItem('stripe_session_id', sessionId);
        localStorage.setItem('subscription_renewed', 'true');
        
        // Clean up URL to prevent re-triggering on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete('session_id');
        window.history.replaceState({}, '', url.toString());
      }
      
      // Auto-open login modal after 2 seconds
      const timer = setTimeout(() => {
        setIsAuthModalOpen(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else if (openAuth === 'signup') {
      setAuthMode('signup');
      setIsAuthModalOpen(true);
    }
    
    // Return undefined for other paths (no cleanup needed)
    return undefined;
  }, [searchParams]);

  // Handle manual login click from success message
  const handleLoginClick = () => {
    setShowRenewalSuccess(false);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-inter">
      <Header />
      
      {/* Renewal Success Message */}
      {showRenewalSuccess && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in-right">
          <div className="glass-strong border border-green-500/30 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2">Subscription Renewed!</h3>
                <p className="text-neutral-300 text-sm mb-4">
                  Your subscription has been successfully activated. Please log in to access your account.
                </p>
                <button
                  onClick={handleLoginClick}
                  className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  Login Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <main>
        <Hero isRenewal={isRenewal}/>
        <Features />
        <Pricing isRenewal={isRenewal}/>
         {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => {
          setIsAuthModalOpen(false);
          setShowRenewalSuccess(false);
        }} 
        initialMode={authMode}
      />
        <Integration />
      </main>
      <Footer />
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
      <HomeContent />
    </Suspense>
  )
}