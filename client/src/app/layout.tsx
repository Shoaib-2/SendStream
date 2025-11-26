// src/app/layout.tsx

import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/authContext';
import { ToastProvider } from '@/context/toastContext';
import { DataProvider } from '@/context/dataContext';
import { SubscriptionProvider } from '@/context/subscriptionContext';
import EmailProvider from '@/components/EmailRetrieval/EmailProvider';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AutoSend - Modern Newsletter Automation',
  description: 'Streamline your newsletter workflow with AI-powered automation, analytics, and subscriber management.',
  keywords: 'newsletter, automation, email marketing, subscriber management, analytics',
  authors: [{ name: 'AutoSend Team' }],
  openGraph: {
    title: 'AutoSend - Modern Newsletter Automation',
    description: 'Streamline your newsletter workflow with AI-powered automation',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('[RootLayout] Rendering with children:', !!children);
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
          <SubscriptionProvider>
            <EmailProvider />
            <DataProvider> 
            {children}
            </DataProvider>
          </SubscriptionProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}