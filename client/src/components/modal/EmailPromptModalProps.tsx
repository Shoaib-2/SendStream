// components/EmailPromptModal.tsx
import React, { useState } from 'react';

interface EmailPromptModalProps {
  onSubmit: (email: string) => void;
  onCancel: () => void;
}

const EmailPromptModal: React.FC<EmailPromptModalProps> = ({ onSubmit, onCancel }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = () => {
    if (email.trim()) {
      onSubmit(email.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-96 p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-4">Enter Your Email</h2>
        <p className="text-gray-400 mb-4">Please provide your email to continue with the subscription</p>
        
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white 
            focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
        />
        
        <div className="flex justify-end space-x-4 mt-6">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={!email.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg 
              hover:bg-blue-600 transition-colors 
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailPromptModal;