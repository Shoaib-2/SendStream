import React, { useState, useEffect } from 'react';
import { X, Loader, AlertCircle } from 'lucide-react';
import { validateEmail, validatePassword } from '../../utils/validation';
import { useAuth } from '../../context/authContext';
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
        
        // Close modal first
        onClose();
        
        // Use window.location for reliable navigation after login
        window.location.href = '/dashboard';
      } else if (mode === 'signup') {
        // Check if we have a stripe session ID for signup
        if (mode === 'signup' && !stripeSessionId) {
          setTrialRequired(true);
          throw new Error('Please start a free trial first to create an account');
        }
        
        // console.log(`Signing up with stripe session ID: ${stripeSessionId || 'none'}`);
        
        try {
          // Include the session ID
          await signup(email, newPassword, stripeSessionId || undefined);
          setSuccessMessage('Account has been created successfully!');
          
          // Clear session ID from localStorage after successful signup
          localStorage.removeItem('stripe_session_id');
          
          // Close modal first
          onClose();
          
          // Use window.location for reliable navigation after signup
          window.location.href = '/dashboard';
        } catch (signupError: unknown) {
          // Check if it's a trial required error from the backend
          if (
            isApiError(signupError) &&
            (signupError.response.data.code === 'TRIAL_REQUIRED' ||
              signupError.response.data.code === 'INVALID_SESSION')
          ) {
            setTrialRequired(true);
            throw new Error(signupError.response.data.message || 'Please start a free trial first');
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Gradient orbs background */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      
      <div className="glass-strong p-8 rounded-2xl w-full max-w-md relative
        border border-white/20 shadow-2xl animate-scale-in">
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500 
          rounded-2xl blur-xl opacity-20" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white z-10
            hover:bg-white/10 rounded-lg transition-all duration-300"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-8 text-center relative z-10">
          <h2 className="text-3xl font-bold font-display gradient-text mb-2">
            {mode === 'login' 
              ? 'Welcome Back' 
              : mode === 'signup' 
                ? 'Create Account' 
                : 'Reset Password'}
          </h2>
          <p className="text-neutral-400 mt-2">
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
          <div className="bg-warning-500/10 border border-warning-500/30 text-warning-400 
            px-4 py-3 rounded-xl mb-6 glass flex items-start gap-3 shadow-soft">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold font-display">Free Trial Required</p>
              <p className="text-sm mt-1 text-warning-300">Please start a free trial first to create an account.</p>
              <button
                onClick={handleStartTrial}
                className="mt-3 px-4 py-2 bg-warning-500/20 hover:bg-warning-500/30 rounded-lg text-sm font-medium
                  border border-warning-500/40 hover:border-warning-500/60 transition-all duration-300
                  hover:scale-105 active:scale-95"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        )}

        {errors.general && !trialRequired && (
          <div className="bg-error-500/10 border border-error-500/30 text-error-400 
            px-4 py-3 rounded-xl mb-6 glass shadow-soft flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="flex-1">{errors.general}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-success-500/10 border border-success-500/30 text-success-400 
            px-4 py-3 rounded-xl mb-6 glass shadow-soft">
            {successMessage}
          </div>
        )}

        {stripeSessionId && mode === 'signup' && (
          <div className="bg-primary-500/10 border border-primary-500/30 text-primary-400 
            px-4 py-3 rounded-xl mb-6 glass shadow-glow">
            Your 14-day free trial is ready! Complete registration to get started.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={`w-full px-4 py-3 bg-neutral-900/50 rounded-xl text-white
                ${errors.email 
                  ? 'border-2 border-error-500/50 focus:border-error-500' 
                  : 'border border-neutral-700 focus:border-primary-500'
                } focus:ring-2 focus:ring-primary-500/20 transition-all duration-300
                placeholder:text-neutral-500`}
              placeholder="your@email.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-error-400 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-300">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full px-4 py-3 bg-neutral-900/50 rounded-xl text-white
                    ${errors.newPassword 
                      ? 'border-2 border-error-500/50 focus:border-error-500' 
                      : 'border border-neutral-700 focus:border-primary-500'
                    } focus:ring-2 focus:ring-primary-500/20 transition-all duration-300
                    placeholder:text-neutral-500`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                {errors.newPassword && (
                  <p className="text-error-400 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.newPassword}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-300">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className={`w-full px-4 py-3 bg-neutral-900/50 rounded-xl text-white
                    ${errors.confirmPassword 
                      ? 'border-2 border-error-500/50 focus:border-error-500' 
                      : 'border border-neutral-700 focus:border-primary-500'
                    } focus:ring-2 focus:ring-primary-500/20 transition-all duration-300
                    placeholder:text-neutral-500`}
                  placeholder="••••••••"
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <p className="text-error-400 text-sm mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </>
          )}

          {mode === 'login' && (
            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium mb-2 text-neutral-300">Password</label>
                <button 
                  type="button" 
                  onClick={() => setMode('forgotPassword')}
                  className="text-sm text-primary-400 hover:text-primary-300 mb-2 transition-colors"
                  disabled={isLoading}
                >
                  Forgot Password?
                </button>
              </div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="current-password"
                className={`w-full px-4 py-3 bg-neutral-900/50 rounded-xl text-white
                  ${errors.newPassword 
                    ? 'border-2 border-error-500/50 focus:border-error-500' 
                    : 'border border-neutral-700 focus:border-primary-500'
                  } focus:ring-2 focus:ring-primary-500/20 transition-all duration-300
                  placeholder:text-neutral-500`}
                placeholder="••••••••"
                disabled={isLoading}
              />
              {errors.newPassword && (
                <p className="text-error-400 text-sm mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.newPassword}
                </p>
              )}
            </div>
          )}

          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500
              text-white px-6 py-3 rounded-xl font-medium shadow-glow
              transform transition-all duration-300 hover:scale-105 disabled:opacity-50
              disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            disabled={isLoading || (mode === 'signup' && !stripeSessionId)}
          >
            {isLoading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Loading...</span>
              </>
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
              className="w-full mt-4 bg-gradient-to-r from-warning-500/20 to-warning-600/20 text-warning-400
                hover:from-warning-500/30 hover:to-warning-600/30 px-6 py-3 rounded-xl border border-warning-500/40
                hover:border-warning-500/60 transition-all duration-300 font-medium flex items-center justify-center gap-2
                hover:scale-105 active:scale-95"
            >
              Start Free Trial First
            </button>
          )}
        </form>

        <div className="mt-6 text-center relative z-10">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 glass text-neutral-400">
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
                setTrialRequired(false);
              } else if (mode === 'signup' || mode === 'forgotPassword') {
                setMode('login');
                setTrialRequired(false);
              }
            }}
            className="text-primary-400 hover:text-primary-300 mt-4 font-medium transition-colors
              hover:underline underline-offset-4"
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

// Type guard for API error
function isApiError(error: unknown): error is { response: { data: { code?: string; message?: string } } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: unknown }).response !== null &&
    'data' in (error as { response: Record<string, unknown> }).response
  );
}

export default AuthModal;