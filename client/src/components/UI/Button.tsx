// src/components/ui/Button.tsx
import React from 'react';
import { ChevronRight } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
  withIcon?: boolean;
  onClick?: () => void;
}


const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, withIcon, ...props }) => {
  const baseStyles = "px-4 py-2 rounded-lg transition-colors";
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-700 hover:bg-gray-600 text-white"
  };

  return (
    <button 
    className={`${baseStyles} ${variants[variant]} ${withIcon ? 'flex items-center gap-2' : ''}`}
      {...props}
    >
      {children}
    </button>
  );
};


export default Button;