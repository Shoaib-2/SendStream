// src/context/AuthContext.tsx
'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '@/services/api';


interface User {
  email: string;
  name?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null; 
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
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

const signup = async (email: string, password: string) => {
  try {
    const response = await authAPI.register({ email, password });
    
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
  const logout = async () => {
    try {
      // Call API to clear the cookie
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API response
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};