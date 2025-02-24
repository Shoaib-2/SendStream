"use client";
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Mail, Users, Settings, LogOut, BarChart, Menu, X 
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/authContext';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal = ({ isOpen, onClose, onConfirm }: LogoutModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800/90 p-6 rounded-2xl w-full max-w-sm border border-gray-700
        animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-bold mb-4">Confirm Logout</h3>
        <p className="text-gray-400 mb-6">Are you sure you want to logout?</p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Newsletters', href: '/dashboard/newsletters', icon: Mail },
    { name: 'Subscribers', href: '/dashboard/subscribers', icon: Users },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-800/50 backdrop-blur-sm
          border border-gray-700 hover:border-blue-500/50 transition-all duration-300"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className="flex">
        <aside className={`fixed h-screen z-40 w-64 bg-gray-900/95 backdrop-blur-sm border-r border-gray-800
          transform transition-transform duration-300 lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-full flex flex-col">
            {user && (
              <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center
                    transform transition-all duration-300 hover:scale-110">
                    <span className="text-blue-400 font-bold text-lg">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-200 font-medium">Welcome back,</p>
                    <p className="text-sm text-gray-400 break-all mt-1">{user.email}</p>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 py-4 px-3 space-y-1">
              {navigation.map((item) => {
                const isCurrentPath = pathname === item.href;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      router.push(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
                      ${isCurrentPath 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/50' 
                        : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'}`}
                  >
                    <item.icon size={20} />
                    <span>{item.name}</span>
                  </button>
                );
              })}

              <button 
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 mt-4 text-red-400 hover:text-red-300
                  hover:bg-red-500/10 rounded-lg transition-all duration-300"
              >
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </aside>

        <main className="flex-1 lg:ml-64 p-6">{children}</main>

        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <LogoutModal 
          isOpen={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={() => {
            handleLogout();
            setShowLogoutModal(false);
          }}
        />
      </div>
    </div>
  );
}