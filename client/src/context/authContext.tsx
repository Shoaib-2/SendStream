// src/context/AuthContext.tsx
'use client'
import React, { createContext, useContext, useState } from 'react';

interface User {
  email: string;
  name?: string;
  password?: string;
  // Add other user properties as needed
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loginWithProvider: (provider: 'google' ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    try {
      // Here you would typically make an API call to your backend
      // For now, we'll simulate a successful login
      setUser({ email });
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      // Here you would typically make an API call to your backend
      // For now, we'll simulate a successful signup
      setUser({ email });
      
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const loginWithProvider = async (provider: 'google') => {
    try {
      // Here you would typically make an API call to your backend
      // For now, we'll simulate a successful login with provider
      setUser({ email: 'provider@example.com' });
    } catch (error) {
      console.error('Login with provider failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loginWithProvider }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};