'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'strong' | 'subtle' | 'glow';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  animate?: boolean;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ 
  className, 
  variant = 'default', 
  padding = 'lg', 
  hover = true, 
  animate = true, 
  children,
  onClick
}) => {
  const variants = {
    default: 'bg-white/5 backdrop-blur-xl border border-white/10',
    strong: 'bg-white/10 backdrop-blur-2xl border border-white/20',
    subtle: 'bg-white/[0.02] backdrop-blur-lg border border-white/5',
    glow: 'bg-white/5 backdrop-blur-xl border border-primary-500/20 shadow-glow',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
    xl: 'p-8',
  };

  const hoverStyles = hover 
    ? 'hover:bg-white/[0.08] hover:border-white/20 hover:shadow-soft-lg transition-all duration-300' 
    : '';

  const baseClassName = cn(
    'rounded-2xl',
    variants[variant],
    paddings[padding],
    hoverStyles,
    className
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={baseClassName}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClassName} onClick={onClick}>
      {children}
    </div>
  );
};

export default GlassCard;
