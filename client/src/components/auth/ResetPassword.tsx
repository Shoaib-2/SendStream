'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader } from 'lucide-react';
import { useAuth } from '@/context/authContext';
import { validatePassword } from '@/utils/validation';

interface ResetPasswordProps {
  token: string;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ token }) => {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    
    // Check if passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await resetPassword(token, password);
      const status = (response as { status?: string })?.status;
      const message = (response as { message?: string })?.message;
      if (status === 'error') {
        throw new Error(message || 'Failed to reset password');
      }
      
      setSuccessMessage('Password reset successful! Redirecting to login...');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl w-full max-w-md
      border border-gray-700 hover:border-blue-500/50 transition-all duration-300">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold font-inter bg-clip-text text-transparent 
          bg-gradient-to-r from-white to-gray-400">
          Reset Password
        </h2>
        <p className="text-gray-400 mt-2">
          Enter your new password below
        </p>
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 
          px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/50 text-green-400 
          px-4 py-3 rounded-xl mb-6 backdrop-blur-sm">
          {successMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">New Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
              focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            placeholder="••••••••"
            disabled={isLoading || !!successMessage}
            required
            minLength={8}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
              focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
            placeholder="••••••••"
            disabled={isLoading || !!successMessage}
            required
            minLength={8}
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg
            transform transition-all duration-300 hover:scale-105 disabled:opacity-50
            disabled:hover:scale-100 font-medium"
          disabled={isLoading || !!successMessage}
        >
          {isLoading ? (
            <Loader className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            'Reset Password'
          )}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;