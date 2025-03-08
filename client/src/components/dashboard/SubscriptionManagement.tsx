import React, { useState, useEffect } from 'react';
import { getSubscriptionStatus, cancelSubscription } from '../../services/api';
import { Loader } from 'lucide-react';

const SubscriptionManagement = () => {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await getSubscriptionStatus();
      setSubscription(response.data?.subscription);
    } catch (err) {
      setError('Failed to load subscription details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) {
      return;
    }
    
    try {
      setCancelling(true);
      setError(null);
      setSuccessMessage(null);
      
      const response = await cancelSubscription(subscription.id);
      setSuccessMessage('Your subscription has been canceled successfully');
      
      // Refresh subscription status
      await fetchSubscriptionStatus();
    } catch (err) {
      setError('Failed to cancel subscription');
      console.error(err);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <h3 className="text-xl font-bold mb-2">Subscription</h3>
        <p className="text-gray-400">You don't have an active subscription</p>
      </div>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold mb-4">Subscription Management</h3>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 
          px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 
          px-4 py-3 rounded-lg mb-4">
          {successMessage}
        </div>
      )}
      
      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-400">Status</span>
          <span className="font-medium">
            {subscription.status === 'trialing' ? 'Trial' : subscription.status}
          </span>
        </div>
        
        {subscription.trialEnd && (
          <div className="flex justify-between">
            <span className="text-gray-400">Trial ends on</span>
            <span className="font-medium">{formatDate(subscription.trialEnd)}</span>
          </div>
        )}
        
        {subscription.currentPeriodEnd && (
          <div className="flex justify-between">
            <span className="text-gray-400">Current period ends</span>
            <span className="font-medium">{formatDate(subscription.currentPeriodEnd)}</span>
          </div>
        )}
        
        <div className="flex justify-between">
          <span className="text-gray-400">Auto renew</span>
          <span className="font-medium">
            {subscription.cancelAtPeriodEnd ? 'No' : 'Yes'}
          </span>
        </div>
      </div>
      
      {!subscription.cancelAtPeriodEnd && (
        <button
          onClick={handleCancelSubscription}
          disabled={cancelling}
          className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 
            border border-red-500/50 px-4 py-2 rounded-lg transition-colors"
        >
          {cancelling ? (
            <Loader className="w-4 h-4 animate-spin mx-auto" />
          ) : (
            'Cancel Subscription'
          )}
        </button>
      )}
      
      {subscription.cancelAtPeriodEnd && (
        <div className="text-gray-400 text-sm">
          Your subscription has been canceled and will end on {formatDate(subscription.currentPeriodEnd)}.
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;