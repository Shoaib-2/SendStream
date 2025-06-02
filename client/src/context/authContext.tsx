// src/context/AuthContext.tsx
'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/services/api';


import { IUser } from '@/types/user';

type User = IUser;

interface ForgotPasswordResponse {
  status: 'success' | 'error';
  message: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null; 
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, stripeSessionId?: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<ForgotPasswordResponse>;
  resetPassword: (token: string, password: string) => Promise<any>;
  // loginWithProvider: (provider: 'google') => Promise<void>;
}

// We still use localStorage for token/user during the transition
// In a full implementation, you would use HTTP-only cookies and a proper session system

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

   // Check token validity - could be enhanced with refresh token logic
  // Check authentication status on load
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        // Make a request to a protected endpoint that validates the cookie
        const response = await authAPI.testConnection();
        
        // If we get a successful response, we're authenticated via cookies
        if (response?.status === 'success' && response?.user) {
          setUser(response.user);
          // We still set the token for backward compatibility
          if (response.token) {
            setToken(response.token);
            // Keep localStorage during transition for backward compatibility
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
          }
        } else {
          // Fallback to localStorage during transition
          const storedToken = localStorage.getItem('token');
          const storedUser = localStorage.getItem('user');
          
          if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
          }
        }
      } catch (error) {
        // Clear localStorage on auth error
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();
  }, []);


 // Update the login and signup methods in AuthContext

const login = async (email: string, password: string) => {
  try {
    const response = await authAPI.login({ email, password });
    
    // Check for error responses that don't throw exceptions
    if (response?.status === 'error') {
      console.error('Login failed:', response.message);
      throw new Error(response.message || 'Authentication failed');
    }
    
    // The JWT is now set as an HTTP-only cookie automatically
    // We still use the response data for the user info
    if (response?.user) {
      setUser(response.user);
      
      // Save token for backward compatibility
      if (response.token) {
        setToken(response.token);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Add these lines to reset renewal flow state
        localStorage.setItem('has_active_access', 'true');
        sessionStorage.removeItem('redirecting_for_renewal');
        // Clear renewal URL parameter if present
        if (typeof window !== 'undefined' && window.location.search.includes('renew=true')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } else {
      // Handle case where response exists but user data is missing
      throw new Error('Invalid login response - user data missing');
    }
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

const signup = async (email: string, password: string, stripeSessionId?: string) => {
  try {
    console.log('Registering with Stripe session ID:', stripeSessionId || 'none');
    
    // Include the Stripe session ID if provided
    const registrationData: any = { email, password };
    if (stripeSessionId) {
      registrationData.stripeSessionId = stripeSessionId;
    }
    
    const response = await authAPI.register(registrationData);
    
    // Check for error responses that don't throw exceptions
    if (response?.status === 'error') {
      console.error('Signup failed:', response.message);
      throw new Error(response.message || 'Registration failed');
    }
    
    // The JWT is now set as an HTTP-only cookie automatically
    // We still use the response data for the user info
    if (response?.user) {
      setUser(response.user);
      
      // Save token for backward compatibility
      if (response.token) {
        setToken(response.token);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Add these lines to reset renewal flow state
        localStorage.setItem('has_active_access', 'true');
        sessionStorage.removeItem('redirecting_for_renewal');
        // Clear renewal URL parameter if present
        if (typeof window !== 'undefined' && window.location.search.includes('renew=true')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } else {
      // Handle case where response exists but user data is missing
      throw new Error('Invalid registration response - user data missing');
    }
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
};

const forgotPassword = async (email: string) => {
  try {
    return await authAPI.forgotPassword(email);
  } catch (error) {
    console.error('Forgot password error:', error);
    throw error;
  }
};

const resetPassword = async (token: string, password: string) => {
  try {
    const response = await authAPI.resetPassword(token, password);
    
    // If successful, update user state
    if (response?.user) {
      setUser(response.user);
      
      // Save token for backward compatibility
      if (response.token) {
        setToken(response.token);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
      }
    }
    
    return response;
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
};

const logout = async () => {
  try {
    await authAPI.logout();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Clear all subscription-related flags
    localStorage.clear(); // Clear everything
    sessionStorage.clear(); // Clear all session storage
    
    // Force navigation to home without parameters
    window.location.href = '/';
  }
};

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      signup, 
      logout,
      forgotPassword,
      resetPassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};