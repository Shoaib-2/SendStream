import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
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
      
      setEmail('');
      setPassword('');
      setErrors({});
      
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('isAuthenticated', 'true');
        document.cookie = 'auth_token=true; path=/';
      }
      
      onClose();
      router.push('/dashboard');
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
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-gray-400 mt-2">
            {mode === 'login' 
              ? 'Sign in to access your account' 
              : 'Create an account to get started'}
          </p>
        </div>

        {errors.general && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 
            px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            {errors.general}
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

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 bg-gray-700/50 rounded-lg 
                ${errors.password 
                  ? 'border border-red-500/50 focus:border-red-500' 
                  : 'border border-gray-600 focus:border-blue-500/50'
                } focus:ring-1 focus:ring-blue-500/50 transition-all duration-300`}
              placeholder="••••••••"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-red-400 text-sm mt-2">{errors.password}</p>
            )}
          </div>

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
              mode === 'login' ? 'Sign In' : 'Create Account'
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
                {mode === 'login' ? 'New here?' : 'Already have an account?'}
              </span>
            </div>
          </div>

          <button 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-blue-400 hover:text-blue-300 mt-4 font-medium transition-colors"
            disabled={isLoading}
          >
            {mode === 'login' ? 'Create an account' : 'Sign in instead'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;