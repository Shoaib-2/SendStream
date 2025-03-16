import React, { useState, useEffect } from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';
import { validateEmail, validatePassword } from '../../utils/validation';
import { useAuth } from '../../context/authContext';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { startFreeTrial, pricingPlans } from '../../services/api';

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
  const searchParams = useSearchParams();
  const { login, signup, forgotPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgotPassword'>(initialMode);
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);
  const [trialRequired, setTrialRequired] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset form state when modal closes
      setEmail('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setSuccessMessage('');
      setTrialRequired(false);
      setMode(initialMode);
    } else {
      // When modal opens, check for session_id in URL or localStorage
      const sessionId = searchParams?.get('session_id') || localStorage.getItem('stripe_session_id');
      if (sessionId) {
        setStripeSessionId(sessionId);
        // If coming from URL, store in localStorage
        if (searchParams?.get('session_id')) {
          localStorage.setItem('stripe_session_id', sessionId);
          // Clear URL parameter if possible
          if (window.history && window.history.replaceState) {
            const url = new URL(window.location.href);
            url.searchParams.delete('session_id');
            window.history.replaceState({}, document.title, url.toString());
          }
        }
      }
    }
  }, [isOpen, initialMode, searchParams]);

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
    setTrialRequired(false);
    setErrors({});
    setSuccessMessage('');
  
    try {
      if (mode === 'login') {
        await login(email, newPassword);
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('isAuthenticated', 'true');
          document.cookie = 'auth_token=true; path=/';
        }
        onClose();
        router.push('/dashboard');
      } else if (mode === 'signup') {
        // Check if we have a stripe session ID for signup
        if (mode === 'signup' && !stripeSessionId) {
          setTrialRequired(true);
          throw new Error('Please start a free trial first to create an account');
        }
        
        console.log(`Signing up with stripe session ID: ${stripeSessionId || 'none'}`);
        
        try {
          // Include the session ID
          await signup(email, newPassword, stripeSessionId || undefined);
          setSuccessMessage('Account has been created successfully!');
          
          // Clear session ID from localStorage after successful signup
          localStorage.removeItem('stripe_session_id');
          
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('isAuthenticated', 'true');
            document.cookie = 'auth_token=true; path=/';
          }
          onClose();
          router.push('/dashboard');
        } catch (signupError: any) {
          // Check if it's a trial required error from the backend
          if (signupError.response?.data?.code === 'TRIAL_REQUIRED' || 
              signupError.response?.data?.code === 'INVALID_SESSION') {
            setTrialRequired(true);
            throw new Error(signupError.response?.data?.message || 'Please start a free trial first');
          }
          throw signupError;
        }
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

  const handleStartTrial = async () => {
    try {
      // Use the Pro plan from the pricingPlans array
      const proPlan = pricingPlans.find(plan => plan.id === 'pro') || pricingPlans[0];
      
      // Start the free trial with email from the form
      await startFreeTrial(proPlan, email || undefined);
      
      // Modal will be closed after successful redirect to Stripe
      // No need to call onClose() here as the page will navigate away
    } catch (error) {
      console.error('Failed to start free trial:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Failed to start free trial' 
      });
      // Don't close the modal on error so user can see the error message
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
                ? (stripeSessionId 
                   ? 'Complete your account setup to activate your trial' 
                   : 'Create an account to get started')
                : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {/* Trial Required Alert */}
        {trialRequired && (
          <div className="bg-amber-500/10 border border-amber-500/50 text-amber-400 
            px-4 py-3 rounded-xl mb-6 backdrop-blur-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Free Trial Required</p>
              <p className="text-sm mt-1">Please start a free trial first to create an account.</p>
              <button
                onClick={handleStartTrial}
                className="mt-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg text-sm
                  border border-amber-500/30 hover:border-amber-500/50 transition-all duration-300"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        )}

        {errors.general && !trialRequired && (
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

        {stripeSessionId && mode === 'signup' && (
          <div className="bg-blue-500/10 border border-blue-500/50 text-blue-400 
            px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
            Your 14-day free trial is ready! Complete registration to get started.
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

          {mode === 'signup' && (
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

          {mode === 'login' && (
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
            disabled={isLoading || (mode === 'signup' && !stripeSessionId)}
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              mode === 'login' 
                ? 'Sign In' 
                : mode === 'signup' 
                  ? (stripeSessionId ? 'Activate Trial' : 'Create Account')
                  : 'Send Reset Link'
            )}
          </button>

          {mode === 'signup' && !stripeSessionId && (
            <button
              type="button"
              onClick={handleStartTrial}
              className="w-full mt-4 bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-400
                hover:from-amber-500/30 hover:to-amber-600/30 px-6 py-3 rounded-lg border border-amber-500/30
                hover:border-amber-500/50 transition-all duration-300 font-medium flex items-center justify-center gap-2"
            >
              Start Free Trial First
            </button>
          )}
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
                setTrialRequired(false); // Reset trial required state when switching modes
              } else if (mode === 'signup' || mode === 'forgotPassword') {
                setMode('login');
                setTrialRequired(false); // Reset trial required state when switching modes
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