import React from 'react';
import { cn } from '@/utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'glass' | 'gradient';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'lg', children, ...props }, ref) => {
    const variants = {
      default: 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-soft',
      hover: 'bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-soft transition-all duration-300 hover:shadow-soft-lg hover:-translate-y-1 hover:border-primary-200 dark:hover:border-primary-800',
      glass: 'glass shadow-soft-lg',
      gradient: 'bg-gradient-to-br from-primary-500/10 via-accent-500/10 to-secondary-500/10 border border-primary-200/50 dark:border-primary-800/50 shadow-soft',
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10',
    };

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl', variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
