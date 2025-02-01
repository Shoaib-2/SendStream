// src/components/auth/AuthModal.tsx
import React, { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { validateEmail, validatePassword } from '@/utils/validation';
import { useAuth } from '@/context/authContext';
import { useRouter } from 'next/navigation';

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const router = useRouter();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);


  // Add cleanup on modal close
  React.useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setErrors({});
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
  
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      
      // Reset form state
      setEmail('');
      setPassword('');
      setErrors({});
      window.localStorage.setItem('isAuthenticated', 'true');
      document.cookie = 'auth_token=true; path=/';
      onClose();
      router.push('/dashboard');
    } catch (error) {
      setErrors({ general: 'Authentication failed' });
    } finally {
      setIsLoading(false);
    }
  };
  if (!isOpen) return null;
  

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md relative">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          disabled={isLoading}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold mb-6">
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h2>

        {/* Error Message */}
        {errors.general && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-2 rounded-lg mb-4">
            {errors.general}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                errors.email ? 'border border-red-500' : ''
              }`}
              placeholder="your@email.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none ${
                errors.password ? 'border border-red-500' : ''
              }`}
              placeholder="••••••••"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              mode === 'login' ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        {/* Mode toggle */}
        <p className="mt-4 text-center text-sm text-gray-400">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button 
                onClick={() => setMode('signup')}
                className="text-blue-500 hover:text-blue-400"
                disabled={isLoading}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button 
                onClick={() => setMode('login')}
                className="text-blue-500 hover:text-blue-400"
                disabled={isLoading}
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default AuthModal;