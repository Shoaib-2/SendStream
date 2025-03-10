// src/app/layout.tsx

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/authContext';
import { ToastProvider } from '@/context/toastContext';
import { DataProvider } from '@/context/dataContext';
import SubscriptionErrorHandler from '@/components/subscription/SubscriptionErrorHandler';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SendStream',
  description: 'Simplify your newsletter workflow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
          <SubscriptionErrorHandler />
            <DataProvider> 
            {children}
            </DataProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}