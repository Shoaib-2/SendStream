// -----------------------------
// Subscription Expired Page
//
// This component is responsible for handling the UI and redirect logic when a user's subscription has expired.
// It checks if the user is already on the renewal page (/?renew=true) and prevents duplicate redirects.
//
// PHASE 1 AUDIT & CLEANUP:
// - Documented the logic for checking and redirecting to the renewal page.
// - This file is one of several that handle renewal logic. See also: SubscriptionErrorHandler.tsx, dataContext.tsx, authContext.tsx, api.ts.
// - TODO: In a future phase, centralize all subscription/renewal logic in a single context or hook to avoid duplication and race conditions.
//
// Current logic:
// - If not already on renewal page, start a countdown and redirect after 5 seconds.
// - If already on renewal page, disables further redirects and updates UI.
// - Stores a return path in localStorage for post-renewal navigation.
//
// If you are refactoring subscription logic, start here and coordinate with other files that handle renewal.
// -----------------------------
import React from 'react';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useSubscription } from '@/context/subscriptionContext';

const ExpiredSubscription = () => {
  const { isRenewalRequired, triggerRenewalRedirect, loading } = useSubscription();

  // If not expired, don't render this page
  if (!isRenewalRequired) return null;

  // If loading, show a spinner
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl max-w-md border border-gray-700 text-center">
          <div className="flex justify-center mb-4">
            <Loader className="w-16 h-16 text-blue-500 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Checking Subscription...</h1>
        </div>
      </div>
    );
  }

  // Render the expired subscription UI
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-xl max-w-md border border-gray-700 text-center">
        <div className="flex justify-center mb-4">
          <AlertCircle className="w-16 h-16 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Subscription Expired</h1>
        <p className="text-gray-300 mb-4">
          Your subscription has expired. Please renew to continue using the service.
        </p>
        <button
          onClick={triggerRenewalRedirect}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 w-full"
        >
          <CheckCircle className="w-4 h-4" />
          Renew Now
        </button>
      </div>
    </div>
  );
};

export default ExpiredSubscription;