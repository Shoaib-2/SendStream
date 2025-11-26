'use client';
import React, { useState } from 'react';
import Button from '../UI/Button';
import Container from '../UI/Container';
import AuthModal from '../auth/authModal';
import { Send, Menu, X, Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
    setIsMenuOpen(false);
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed w-full glass-strong z-50 border-b border-white/10">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
        
        <Container size="xl" className="py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-3 group cursor-pointer"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl blur-md 
                  opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl 
                  flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Send className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-bold font-display gradient-text">
                  SendStream
                </span>
                <span className="text-[10px] sm:text-xs text-neutral-400 -mt-1">Newsletter Platform</span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection('features')}
                className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-sm font-medium text-neutral-300 hover:text-white transition-colors"
              >
                Pricing
              </button>
              
              <div className="h-6 w-px bg-neutral-700" />
              
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => handleAuthClick('login')}
              >
                Log in
              </Button>
              <Button
                variant="gradient"
                size="sm"
                onClick={() => handleAuthClick('signup')}
                className="shadow-glow"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Sign up
              </Button>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-all"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </Container>

        {/* Mobile menu */}
        <div className={`
          md:hidden absolute w-full glass border-t border-white/10
          transition-all duration-300 ease-in-out overflow-hidden
          ${isMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}>
          <Container size="xl" className="py-6 space-y-4">
            <button
              onClick={() => scrollToSection('features')}
              className="block w-full text-left px-4 py-3 rounded-xl text-neutral-300 hover:text-white 
                hover:bg-white/5 transition-all"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="block w-full text-left px-4 py-3 rounded-xl text-neutral-300 hover:text-white 
                hover:bg-white/5 transition-all"
            >
              Pricing
            </button>
            
            <div className="h-px bg-neutral-800" />
            
            <Button 
              variant="outline"
              onClick={() => handleAuthClick('login')}
              className="w-full"
            >
              Log in
            </Button>
            <Button
              variant="gradient"
              onClick={() => handleAuthClick('signup')}
              className="w-full shadow-glow"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Sign up
            </Button>
          </Container>
        </div>
      </nav>

      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authMode}
        />
      )}
    </>
  );
};

export default Header;