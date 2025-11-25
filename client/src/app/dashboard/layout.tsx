"use client";
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Mail, Users, Settings, LogOut, BarChart, Menu, X, Send 
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/authContext';
import Button from '@/components/UI/Button';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal = ({ isOpen, onClose, onConfirm }: LogoutModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-strong p-6 rounded-2xl w-full max-w-sm border border-white/20 shadow-2xl animate-scale-in">
        <div className="absolute -inset-1 bg-gradient-to-r from-error-500 to-error-600 rounded-2xl blur-xl opacity-20" />
        <div className="relative">
          <h3 className="text-xl font-bold font-display gradient-text mb-2">Confirm Logout</h3>
          <p className="text-neutral-400 mb-6">Are you sure you want to logout?</p>
          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onConfirm}
            >
              Logout
            </Button>
          </div>
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
    <div className="min-h-screen bg-neutral-950">
      {/* Mesh gradient background */}
      <div className="fixed inset-0 mesh-gradient-dark opacity-30 pointer-events-none" />
      
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl glass-strong
          border border-white/10 hover:border-primary-500/50 transition-all duration-300 shadow-soft"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-neutral-300" />}
      </button>

      <div className="flex relative">
        {/* Sidebar */}
        <aside className={`fixed h-screen z-40 w-72 glass-strong border-r border-white/10
          transform transition-transform duration-300 lg:translate-x-0 shadow-2xl
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
          
          <div className="h-full flex flex-col">
            {/* Logo & Brand */}
            <div className="p-6 border-b border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl blur-md opacity-50" />
                  <div className="relative w-11 h-11 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl 
                    flex items-center justify-center">
                    <Send className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-xl font-bold font-display gradient-text">AutoSend</h1>
                  <p className="text-xs text-neutral-500">Newsletter Platform</p>
                </div>
              </div>

              {/* User info */}
              {user && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 
                    flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-lg">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">Welcome back</p>
                    <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto scrollbar-hide">
              {navigation.map((item) => {
                const isCurrentPath = pathname === item.href;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      router.push(item.href);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                      group relative overflow-hidden
                      ${isCurrentPath 
                        ? 'bg-primary-500/10 text-primary-400 border border-primary-500/30 shadow-glow' 
                        : 'text-neutral-400 hover:bg-white/5 hover:text-white border border-transparent'}`}
                  >
                    {isCurrentPath && (
                      <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 to-secondary-500/10 rounded-xl" />
                    )}
                    <item.icon size={20} className={`relative z-10 ${isCurrentPath ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                    <span className="relative z-10 font-medium">{item.name}</span>
                  </button>
                );
              })}

              <div className="pt-4 mt-4 border-t border-white/10">
                <button 
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white
                    hover:bg-error-500/20 rounded-xl transition-all duration-300 group border border-error-500/30
                    hover:border-error-500/50 shadow-soft hover:shadow-glow"
                >
                  <LogOut size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </nav>

            {/* Bottom accent */}
            <div className="p-4 border-t border-white/10">
              <div className="text-center text-xs text-neutral-500">
                <p>AutoSend Dashboard v1.0</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-72 relative z-10">
          {children}
        </main>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Logout modal */}
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