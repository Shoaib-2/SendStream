'use client'
import React, { useEffect } from 'react';

declare global {
    interface Window {
      checkoutEmail?: string;
      getUserEmail?: () => string;
    }
  }

// This component directly handles email state for the checkout process
const EmailProvider: React.FC = () => {
  // Function to get user email from all possible sources
  const findUserEmail = (): string => {
    try {
      // Try user_email key first
      const directEmail = localStorage.getItem('user_email');
      if (directEmail) return directEmail;
      
      // Try user object
      const userJson = localStorage.getItem('user');
      if (userJson) {
        try {
          const user = JSON.parse(userJson);
          if (user && user.email) return user.email;
        } catch (e) {
          console.error('Error parsing user JSON:', e);
        }
      }
      
      return '';
    } catch (e) {
      console.error('Error accessing localStorage:', e);
      return '';
    }
  };

  useEffect(() => {
    const email = findUserEmail();
    
    // Store email in multiple locations for redundancy
    if (email) {
      try {
        localStorage.setItem('checkout_email', email);
        // Create a global variable for direct access
        window.checkoutEmail = email;
        
        console.log('EmailProvider: Set checkout email', { email });
      } catch (e) {
        console.error('Error setting checkout email:', e);
      }
    }
    
    // Create a helper function globally available
    window.getUserEmail = findUserEmail;
    
    // Override the fetch API to inject email into checkout requests
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      // Only modify checkout API requests
      if (typeof input === 'string' && input.includes('/api/stripe/checkout')) {
        const email = findUserEmail();
        if (email && init && init.body) {
          try {
            const body = JSON.parse(init.body.toString());
            
            // Set email in request body if not already set
            if (!body.email || body.email === '') {
              body.email = email;
              console.log('Injecting email into checkout request:', { email });
              
              // Update the request with the modified body
              init.body = JSON.stringify(body);
            }
          } catch (e) {
            console.error('Error modifying checkout body:', e);
          }
        }
      }
      
      return originalFetch.apply(this, [input, init]);
    };
    
    return () => {
      // Restore original fetch on unmount
      window.fetch = originalFetch;
    };
  }, []);

  return null;
};

export default EmailProvider;