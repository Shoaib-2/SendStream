'use client';
import React, { useState } from 'react';
import Button from '../UI/Button';
import AuthModal from '../auth/authModal';
import { Send, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav className="fixed w-full bg-gray-900/95 backdrop-blur-sm z-40 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg rotate-45 group-hover:rotate-90 transition-transform duration-300">
                <Send className="w-5 h-5 text-blue-500 -rotate-45 group-hover:rotate-0 transition-transform duration-300 translate-x-1.5 translate-y-1.5" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                SendStream
              </span>
            </div>

            {/* Desktop menu */}
            <div className="hidden md:flex items-center gap-4">
              <Button 
                variant="outline"
                onClick={() => handleAuthClick('login')}
                className="px-5"
              >
                Log in
              </Button>
              <Button
                onClick={() => handleAuthClick('signup')}
                className="px-5"
              >
                Sign up
              </Button>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`
          md:hidden absolute w-full bg-gray-900/95 backdrop-blur-sm border-b border-gray-800
          transition-all duration-300 ease-in-out
          ${isMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 invisible'}
        `}>
          <div className="px-4 py-4 space-y-4">
            <Button 
              variant="outline"
              onClick={() => handleAuthClick('login')}
              className="w-full"
            >
              Log in
            </Button>
            <Button
              onClick={() => handleAuthClick('signup')}
              className="w-full"
            >
              Sign up
            </Button>
          </div>
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