// src/app/dashboard/layout.tsx
"use client";
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Mail, Users, Settings, LogOut } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/authContext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Newsletters', href: '/dashboard/newsletters', icon: Mail },
    { name: 'Subscribers', href: '/dashboard/subscribers', icon: Users },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex">
        <aside className="fixed h-screen w-64 bg-gray-800 p-4">
          <div className="h-full flex flex-col">
            {user && (
              <div className="mb-8 p-4 bg-gray-700 rounded-lg">
                <p className="font-medium">{user.email}</p>
              </div>
            )}
            <nav className="flex-1 space-y-2">
              {navigation.map((item) => (
                <button
                  key={item.name}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg ${
                    pathname === item.href ? 'bg-gray-700' : 'hover:bg-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </button>
              ))}
            </nav>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-gray-700 rounded-lg"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </aside>
        <main className="flex-1 ml-64 p-8">{children}</main>
      </div>
    </div>
  );
}