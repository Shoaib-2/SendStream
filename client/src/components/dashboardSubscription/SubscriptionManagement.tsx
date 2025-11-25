import React, { useState, useEffect } from 'react';
import { getSubscriptionStatus, cancelSubscription } from '../../services/api';
import {
  ArrowPathIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';


interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

const CancelModal: React.FC<CancelModalProps> = ({ isOpen, onClose, onConfirm, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-strong p-6 rounded-2xl w-full max-w-md
        border border-white/20 shadow-2xl animate-scale-in">
        <div className="flex items-center gap-3 mb-4 text-error-400">
          <ExclamationCircleIcon className="w-6 h-6" />
          <h3 className="text-xl font-bold">Cancel Subscription</h3>
        </div>

        <p className="text-neutral-300 mb-6">
          Are you sure you want to cancel your subscription? You&apos;ll still have access until the end of your current billing period.
        </p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg glass hover:bg-white/10 text-neutral-200 border border-white/10
              hover:border-primary-500/50 transition-all font-medium"
            disabled={isLoading}
          >
            Keep Subscription
          </button>

          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-error-500/20 hover:bg-error-500/30 text-error-400
              border border-error-500/50 transition-all flex items-center gap-2 font-medium shadow-glow"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Canceling...
              </>
            ) : (
              <>
                <XCircleIcon className="w-4 h-4" />
                Cancel Subscription
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface Subscription {
  id: string;
  status?: string;
  trialEnd?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  [key: string]: unknown;
}

const SubscriptionManagement = () => {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState(false);
  const [updatingAutoRenew, setUpdatingAutoRenew] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      setAuthError(false);

      // Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthError(true);
        return;
      }

      const response = await getSubscriptionStatus();
      setSubscription(response.data?.subscription);
    } catch (err: unknown) {
      console.error("Error fetching subscription status:", err);
      let errorMessage = '';
      if (isApiError(err) && typeof err.message === 'string') {
        errorMessage = err.message;
      }
      if (
        errorMessage.includes('Not authenticated') ||
        errorMessage.includes('User no longer exists') ||
        errorMessage.includes('Failed to fetch subscription status')
      ) {
        setAuthError(true);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        setError('Failed to load subscription details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelButton = () => {
    setShowCancelModal(true);
  };

  const handleCloseModal = () => {
    setShowCancelModal(false);
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.id) {
      setError('No subscription ID found');
      setShowCancelModal(false);
      return;
    }

    try {
      setCancelling(true);
      setError(null);
      setSuccessMessage(null);

      const response = await cancelSubscription(subscription.id);
      setSuccessMessage(response.data?.message || 'Your subscription has been cancelled successfully');

      // Refresh subscription status
      await fetchSubscriptionStatus();
    } catch (err: unknown) {
      console.error("Error canceling subscription:", err);
      let errorMessage = '';
      let responseMessage = '';
      if (isApiError(err) && typeof err.message === 'string') {
        errorMessage = err.message;
      }
      if (isApiError(err) && err.response?.data?.message) {
        responseMessage = err.response.data.message;
      }
      if (
        errorMessage.includes('Not authenticated') ||
        errorMessage.includes('User no longer exists')
      ) {
        setAuthError(true);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        setError(responseMessage || 'Failed to cancel subscription');
      }
    } finally {
      setCancelling(false);
      setShowCancelModal(false);
    }
  };

  // Handle toggling auto-renewal
  const toggleAutoRenew = async () => {
    if (!subscription?.id) {
      setError('No subscription ID found');
      return;
    }

    try {
      setUpdatingAutoRenew(true);
      setError(null);

      // Current value determines what we want to set it to
      const currentAutoRenew = !subscription.cancelAtPeriodEnd;
      const newAutoRenew = !currentAutoRenew;

      // Import the function from api.ts
      const { updateSubscriptionRenewal } = await import('../../services/api');

      // Call the new API function
      const response = await updateSubscriptionRenewal(
        subscription.id,
        newAutoRenew // pass the desired auto-renew state
      );

      if (response?.status === 'success') {
        // Update the local subscription object
        setSubscription({
          ...subscription,
          cancelAtPeriodEnd: !newAutoRenew
        });

        setSuccessMessage(newAutoRenew ?
          'Auto-renewal enabled successfully' :
          'Auto-renewal disabled successfully');
      }
    } catch (err: unknown) {
      console.error("Error updating auto-renewal:", err);
      setError((err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string')
        ? (err as { message: string }).message
        : 'Failed to update auto-renewal settings');
    } finally {
      setUpdatingAutoRenew(false);
    }
  };


  // Handle login redirect for auth errors
  const handleLogin = () => {
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <div className="w-12 h-12 relative">
          <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 blur-xl" />
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="glass p-6 rounded-2xl border border-white/10">
        <h3 className="text-xl font-bold mb-2 text-white">Subscription</h3>
        <p className="text-neutral-400 mb-4">You need to log in to view your subscription details</p>
        <button
          onClick={handleLogin}
          className="bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700
            text-white px-4 py-2 rounded-lg transition-all shadow-glow font-medium"
        >
          Log in
        </button>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="glass p-6 rounded-2xl border border-white/10">
        <h3 className="text-xl font-bold mb-2 text-white">Subscription</h3>
        <p className="text-neutral-400">You don&apos;t have an active subscription</p>
      </div>
    );
  }

  const formatDate = (date?: string) => {
    return new Date(date ?? '').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Check if subscription is expired
  const isExpired = subscription.status === 'cancelled' &&
    new Date(subscription.currentPeriodEnd ?? '') < new Date();

  return (
    <div>
      <h3 className="text-xl font-bold mb-4 text-white">Subscription Management</h3>

      {error && (
        <div className="bg-error-500/10 border border-error-500/50 text-error-400 
          px-4 py-3 rounded-lg mb-4 flex items-start gap-2 shadow-soft">
          <ExclamationCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-success-500/10 border border-success-500/50 text-success-400 
          px-4 py-3 rounded-lg mb-4 flex items-start gap-2 shadow-soft">
          <CheckCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Expired warning */}
      {isExpired && (
        <div className="bg-warning-500/10 border border-warning-500/50 text-warning-400 
          px-4 py-3 rounded-lg mb-4 shadow-soft">
          Your subscription has expired. Please renew to continue using the service.
        </div>
      )}

      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-neutral-400">Status</span>
          <span className={`font-medium ${isExpired ? 'text-warning-400' : 'text-white'}`}>
            {isExpired ? 'Expired' :
              subscription.status === 'trialing' ? 'Trial' : subscription.status}
          </span>
        </div>

        {subscription.trialEnd && (
          <div className="flex justify-between">
            <span className="text-neutral-400">Trial ends on</span>
            <span className="font-medium text-white">{formatDate(subscription.trialEnd)}</span>
          </div>
        )}

        {subscription.currentPeriodEnd && (
          <div className="flex justify-between">
            <span className="text-neutral-400">
              {subscription.cancelAtPeriodEnd ? 'Access until' : 'Current period ends'}
            </span>
            <span className="font-medium text-white">{formatDate(subscription.currentPeriodEnd)}</span>
          </div>
        )}

        {/* Auto-renew toggle - always show this row */}
        <div className="flex justify-between items-center">
          <span className="text-neutral-400">Auto renew</span>

          <div className="flex items-center gap-2">
            <span className="font-medium text-white">
              {subscription.cancelAtPeriodEnd ? 'No' : 'Yes'}
            </span>

            <button
              onClick={toggleAutoRenew}
              disabled={updatingAutoRenew || isExpired}
              className="relative inline-flex items-center disabled:opacity-50"
              aria-label={subscription.cancelAtPeriodEnd ? "Enable auto-renewal" : "Disable auto-renewal"}
            >
              {updatingAutoRenew ? (
                <ArrowPathIcon className="w-5 h-5 animate-spin text-primary-400" />
              ) : (
                <div className={`w-11 h-6 rounded-full transition-all duration-300 ${subscription.cancelAtPeriodEnd
                    ? 'bg-neutral-700'
                    : 'bg-gradient-to-r from-primary-500 to-primary-600 shadow-glow'
                  } relative`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform ${subscription.cancelAtPeriodEnd
                      ? 'translate-x-0'
                      : 'translate-x-full'
                    }`}></div>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Always show Cancel button if not expired and auto-renewal is on */}
      {!subscription.cancelAtPeriodEnd && !isExpired && (
        <button
          onClick={handleCancelButton}
          className="w-full bg-error-500/20 hover:bg-error-500/30 text-white
            border border-error-500/50 hover:border-error-500/70 px-4 py-2.5 rounded-lg transition-all
            flex items-center justify-center gap-2 font-medium shadow-soft hover:shadow-glow"
        >
          <XCircleIcon className="w-5 h-5" />
          Cancel Subscription
        </button>
      )}

      {subscription.cancelAtPeriodEnd && !isExpired && (
        <div className="text-neutral-400 text-sm flex items-start gap-2 bg-warning-500/10 
          border border-warning-500/30 rounded-lg p-3">
          <CheckCircleIcon className="w-4 h-4 mt-0.5 text-warning-400 flex-shrink-0" />
          <span>
            Your subscription has been cancelled and will end on {formatDate(subscription.currentPeriodEnd)}.
            You&apos;ll continue to have full access until this date.
          </span>
        </div>
      )}

      {isExpired && (
        <button
          onClick={() => router.push('/pricing')}
          className="w-full bg-gradient-to-r from-primary-500 to-primary-600 
            hover:from-primary-600 hover:to-primary-700 text-white 
            px-4 py-2 rounded-lg transition-all mt-4 shadow-glow
            flex items-center justify-center gap-2 font-medium"
        >
          Renew Subscription
        </button>
      )}

      {/* Cancel Confirmation Modal */}
      <CancelModal
        isOpen={showCancelModal}
        onClose={handleCloseModal}
        onConfirm={handleCancelSubscription}
        isLoading={cancelling}
      />
    </div>
  );
};

export default SubscriptionManagement;

// Type guard for API error
function isApiError(error: unknown): error is { message?: string; response?: { data?: { message?: string } } } {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('message' in error || 'response' in error)
  );
}