// src/components/auth/SocialAuth.tsx
/**
 * @component SocialAuth
 * @description Provides social authentication options (Google & GitHub)
 * This component handles OAuth authentication flows for multiple providers
 */
import React from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { useToast } from '@/context/toastContext';

interface SocialAuthProps {
  isLoading: boolean;
}


const SocialAuth: React.FC<SocialAuthProps> = ({ isLoading }) => {
  const { loginWithProvider } = useAuth();
  const { showToast } = useToast();

  /**
   * Handles social authentication with specified provider
   * @param {string} provider - The authentication provider (google/github)
   */
  const handleSocialAuth = async (provider: 'google' ) => {
    try {
      await loginWithProvider(provider);
      showToast('Successfully logged in!', 'success');
    } catch (error) {
      showToast('Authentication failed', 'error');
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-700" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-gray-800 px-2 text-gray-400">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleSocialAuth('google')}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-700 px-4 py-2 hover:bg-gray-700 transition-colors"
        >
          <Mail className="w-5 h-5" />
          <span>Google</span>
        </button>
      </div>
    </div>
  );
};

export default SocialAuth;