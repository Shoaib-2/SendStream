// src/app/page.tsx
'use client'
import Header from '@/components/layout/Header'
import Hero from '@/components/sections/Hero'
import Features from '@/components/sections/Features'
import Pricing from '@/components/sections/Pricing'
import Integration from '@/components/sections/Integration'
import Footer from '@/components/layout/Footer'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import AuthModal from '@/components/auth/authModal'

export default function Home() {
  const searchParams = useSearchParams();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isRenewal, setIsRenewal] = useState(false);

  useEffect(() => {
    // Check for URL parameters
    const openAuth = searchParams.get('openAuth');
    const sessionId = searchParams.get('session_id');
    const renew = searchParams.get('renew');
    
    // Set renewal state
    if (renew === 'true') {
      setIsRenewal(true);
    }
    
    if (openAuth === 'signup' || sessionId) {
      setAuthMode('signup');
      setIsAuthModalOpen(true);
      
      // Store session ID to be handled by AuthModal
      if (sessionId && typeof window !== 'undefined') {
        localStorage.setItem('stripe_session_id', sessionId);
        // console.log('Stored Stripe session ID:', sessionId);
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-inter">
      <Header />
      <main>
        <Hero isRenewal={isRenewal}/>
        <Features />
        <Pricing isRenewal={isRenewal}/>
         {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode}
      />
        <Integration />
      </main>
      <Footer />
    </div>
  )
}