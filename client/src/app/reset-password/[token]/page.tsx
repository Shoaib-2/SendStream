'use client';
import { use } from 'react';
import ResetPassword from '@/components/auth/ResetPassword';

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  // Unwrap params using React.use
  const resolvedParams = use(params);
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/80 flex items-center justify-center p-4">
      <ResetPassword token={resolvedParams.token} />
    </div>
  );
}