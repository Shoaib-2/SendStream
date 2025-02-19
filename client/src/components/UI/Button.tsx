import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  variant?: 'primary' | 'outline';
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary',
  ...props 
}) => {
  const baseStyles = "px-6 py-3 rounded-lg font-medium inline-flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50";
  
  const variants = {
    primary: "bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 hover:shadow-lg active:scale-95",
    outline: "border-2 border-gray-700 text-gray-300 hover:border-blue-500 hover:text-blue-500 hover:scale-105 active:scale-95"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;