import React from 'react';
import { cn } from '@/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300',
      primary: 'bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 ring-1 ring-inset ring-primary-700/10',
      secondary: 'bg-secondary-100 dark:bg-secondary-950 text-secondary-700 dark:text-secondary-300 ring-1 ring-inset ring-secondary-700/10',
      success: 'bg-success-100 dark:bg-success-950 text-success-700 dark:text-success-300 ring-1 ring-inset ring-success-700/10',
      warning: 'bg-warning-100 dark:bg-warning-950 text-warning-700 dark:text-warning-300 ring-1 ring-inset ring-warning-700/10',
      error: 'bg-error-100 dark:bg-error-950 text-error-700 dark:text-error-300 ring-1 ring-inset ring-error-700/10',
      outline: 'border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300',
    };

    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm',
      lg: 'px-3 sm:px-4 py-1 sm:py-1.5 text-sm sm:text-base',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'badge inline-flex items-center font-medium rounded-full',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
