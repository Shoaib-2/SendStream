// src/components/layout/Header.tsx
'use client';
import React, { useState } from 'react';
import Button from '../UI/Button';
import AuthModal from '../auth/authModal';

const Header: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleAuthClick = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleCloseModal = () => {
    setShowAuthModal(false);
  };

  return (
    <>
      <nav className="fixed w-full bg-gray-900/95 backdrop-blur-sm z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">SendStream</div>
            <div className="space-x-4">
              <Button 
                variant="secondary"
                onClick={() => handleAuthClick('login')}
              >
                Log in
              </Button>
              <Button
                onClick={() => handleAuthClick('signup')}
              >
                Sign up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {showAuthModal && (
        <AuthModal 
          isOpen={showAuthModal}
          onClose={handleCloseModal}
          initialMode={authMode}
        />
      )}
    </>
  );
};

export default Header;