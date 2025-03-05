import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { validateEmail, validatePassword } from '../../utils/validation';
import { useAuth } from '../../context/authContext';
import { useRouter } from 'next/navigation';

interface FormErrors {
  email?: string;
  newPassword?: string; // Only new password error
  confirmPassword?: string; // Only confirm password error
  general?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const router = useRouter();
  const { login, signup, forgotPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgotPassword'>(initialMode);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState(''); // New state for new password
  const [confirmPassword, setConfirmPassword] = useState(''); // New state for confirm password
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState(''); // State for success message

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setNewPassword(''); // Reset new password
      setConfirmPassword(''); // Reset confirm password
      setErrors({});
      setSuccessMessage(''); // Reset success message
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    if (mode === 'signup') {
        if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }
        const newPasswordError = validatePassword(newPassword);
        if (newPasswordError) newErrors.newPassword = newPasswordError;
    }

    if (mode === 'login' && !newPassword) {
        newErrors.newPassword = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
  
    try {
      if (mode === 'login') {
        await login(email, newPassword); // Use new password for login
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('isAuthenticated', 'true');
          document.cookie = 'auth_token=true; path=/';
        }
        onClose();
        router.push('/dashboard');
      } else if (mode === 'signup') {
        await signup(email, newPassword); // Use new password for signup
        setSuccessMessage('Account has been created successfully!'); // Set success message
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('isAuthenticated', 'true');
          document.cookie = 'auth_token=true; path=/';
        }
        onClose();
        router.push('/dashboard');
      } else if (mode === 'forgotPassword') {
        const response = await forgotPassword(email);
        if (response.status === 'success') {
          setSuccessMessage(response.message || 'Password reset link sent to your email');
        } else {
          throw new Error(response.message || 'Failed to process password reset request');
        }
      }
      
      if (mode !== 'forgotPassword') {
        setEmail('');
        setNewPassword('');
        setConfirmPassword('');
        setErrors({});
      }
    } catch (error) {
      setErrors({ 
        general: error instanceof Error ? error.message : 'Authentication failed' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl w-full max-w-md relative
        border border-gray-700 hover:border-blue-500/50 transition-all duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white
            hover:bg-gray-700/50 rounded-lg transition-all duration-300"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold font-inter bg-clip-text text-transparent 
            bg-gradient-to-r from-white to-gray-400">
            {mode === 'login' 
              ? 'Welcome Back' 
              : mode === 'signup' 
                ? 'Create Account' 
                : 'Reset Password'}
          </h2>
          <p className="text-gray-400 mt-2">
            {mode === 'login' 
              ? 'Sign in to access your account' 
              : mode === 'signup'
                ? 'Create an account to get started'
                : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {errors.general && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 
            px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            {errors.general}
          </div>
        )}

        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/50 text-green-400 
            px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 bg-gray-700/50 rounded-lg 
                ${errors.email 
                  ? 'border border-red-500/50 focus:border-red-500' 
                  : 'border border-gray-600 focus:border-blue-500/50'
                } focus:ring-1 focus:ring-blue-500/50 transition-all duration-300`}
              placeholder="your@email.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-2">{errors.email}</p>
            )}
          </div>

          {mode === 'signup' && ( // Only show these fields in signup mode
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700/50 rounded-lg 
                    ${errors.newPassword 
                      ? 'border border-red-500/50 focus:border-red-500' 
                      : 'border border-gray-600 focus:border-blue-500/50'
                    } focus:ring-1 focus:ring-blue-500/50 transition-all duration-300`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                {errors.newPassword && (
                  <p className="text-red-400 text-sm mt-2">{errors.newPassword}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-700/50 rounded-lg 
                    ${errors.confirmPassword 
                      ? 'border border-red-500/50 focus:border-red-500' 
                      : 'border border-gray-600 focus:border-blue-500/50'
                    } focus:ring-1 focus:ring-blue-500/50 transition-all duration-300`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-red-400 text-sm mt-2">{errors.confirmPassword}</p>
                )}
              </div>
            </>
          )}

          {mode === 'login' && ( // Only show this field in login mode
            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
                <button 
                  type="button" 
                  onClick={() => setMode('forgotPassword')}
                  className="text-sm text-blue-400 hover:text-blue-300 mb-2"
                  disabled={isLoading}
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-4 py-3 bg-gray-700/50 rounded-lg 
                  ${errors.newPassword 
                    ? 'border border-red-500/50 focus:border-red-500' 
                    : 'border border-gray-600 focus:border-blue-500/50'
                  } focus:ring-1 focus:ring-blue-500/50 transition-all duration-300`}
                placeholder="••••••••"
                disabled={isLoading}
              />
              {errors.newPassword && (
                <p className="text-red-400 text-sm mt-2">{errors.newPassword}</p>
              )}
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg
              transform transition-all duration-300 hover:scale-105 disabled:opacity-50
              disabled:hover:scale-100 font-medium"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              mode === 'login' 
                ? 'Sign In' 
                : mode === 'signup' 
                  ? 'Create Account' 
                  : 'Send Reset Link'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-800/50 text-gray-400">
                {mode === 'login' 
                  ? 'New here?' 
                  : mode === 'signup' 
                    ? 'Already have an account?' 
                    : 'Remember your password?'}
              </span>
            </div>
          </div>

          <button 
            onClick={() => {
              if (mode === 'login') {
                setMode('signup');
              } else if (mode === 'signup' || mode === 'forgotPassword') {
                setMode('login');
              }
            }}
            className="text-blue-400 hover:text-blue-300 mt-4 font-medium transition-colors"
            disabled={isLoading}
          >
            {mode === 'login' 
              ? 'Create an account' 
              : mode === 'signup' 
                ? 'Sign in instead' 
                : 'Back to login'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;