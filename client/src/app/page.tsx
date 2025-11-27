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
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react'

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
        
        {/* AI Feature Highlight Banner */}
        <section className="relative py-12 bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-purple-900/20 border-y border-purple-500/20">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center flex-shrink-0 border border-purple-500/40 animate-pulse-slow">
                  <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      AI-Powered Content Generation
                    </h3>
                    <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold border border-green-500/30">
                      NEW
                    </span>
                  </div>
                  <p className="text-neutral-300 text-sm sm:text-base">
                    Create engaging newsletters in seconds with our AI assistant. Generate content, get subject line suggestions, improve your writing, and find the perfect send time.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4 text-xs sm:text-sm text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      Smart Content Generation
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      Subject Line Optimization
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                      Intelligent Scheduling
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setAuthMode('signup');
                  setIsAuthModalOpen(true);
                }}
                className="flex-shrink-0 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold
                  hover:shadow-glow-lg transition-all duration-300 flex items-center gap-2 group"
              >
                Try AI Features
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </section>
        
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