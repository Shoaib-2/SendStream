'use client';
import React from 'react';
import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'rectangular', style }) => {
  const baseStyles = 'bg-white/5 animate-pulse';
  
  const variants = {
    text: 'h-4 rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
    card: 'rounded-2xl h-32',
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} style={style} />
  );
};

// Card skeleton for dashboard
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6', className)}>
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="w-12 h-12 rounded-xl" />
      <Skeleton className="w-16 h-6 rounded-full" />
    </div>
    <Skeleton variant="text" className="w-24 mb-2" />
    <Skeleton variant="text" className="w-32 h-8" />
  </div>
);

// Stats grid skeleton
export const StatsGridSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    {[...Array(4)].map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </div>
);

// Table skeleton
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
    <div className="p-4 border-b border-white/10">
      <Skeleton variant="text" className="w-48 h-6" />
    </div>
    <div className="divide-y divide-white/5">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-48" />
            <Skeleton variant="text" className="w-32 h-3" />
          </div>
          <Skeleton className="w-20 h-8 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

// Chart skeleton
export const ChartSkeleton: React.FC = () => (
  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
    <Skeleton variant="text" className="w-48 h-6 mb-6" />
    <div className="h-64 flex items-end justify-around gap-2">
      {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-lg" style={{ height: `${height}%` }} />
      ))}
    </div>
  </div>
);

// Full page loading skeleton
export const PageSkeleton: React.FC = () => (
  <div className="space-y-8 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton variant="text" className="w-64 h-8" />
        <Skeleton variant="text" className="w-48 h-4" />
      </div>
      <Skeleton className="w-32 h-10 rounded-xl" />
    </div>
    <StatsGridSkeleton />
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartSkeleton />
      <ChartSkeleton />
    </div>
  </div>
);

export default Skeleton;
