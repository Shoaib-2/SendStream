"use client";
import React, { useState, useEffect } from 'react';
import DashboardHeader from '@/components/layout/DashboardHeader';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* Mesh gradient background */}
      <div className="fixed inset-0 mesh-gradient-dark opacity-30 pointer-events-none" />
      
      {/* Header */}
      <DashboardHeader />

      {/* Main content */}
      <main className="relative z-10 pt-16">
        {children}
      </main>
    </div>
  );
}