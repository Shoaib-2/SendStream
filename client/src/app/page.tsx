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
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    // Check for URL parameters
    const openAuth = searchParams.get('openAuth');
    const session = searchParams.get('session_id');
    
    if (openAuth === 'signup') {
      setAuthMode('signup');
      setIsAuthModalOpen(true);
      
      if (session) {
        setSessionId(session);
        // Store session ID in localStorage for subscription association
        localStorage.setItem('stripe_session_id', session);
      }
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-inter">
      <Header />
      <main>
        <Hero />
        <Features />
        <Pricing />
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