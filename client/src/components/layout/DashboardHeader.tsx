'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Mail, Users, BarChart, Settings, 
  LogOut, Menu, X, Send, ChevronDown, User
} from 'lucide-react';
import { useAuth } from '@/context/authContext';
import Button from '@/components/UI/Button';

const DashboardHeader: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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
    <>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
        
        <nav className="bg-neutral-950/70 backdrop-blur-2xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl blur-md 
                    opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl 
                    flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>
                <span className="text-base sm:text-lg font-bold font-display gradient-text hidden sm:block">
                  SendStream
                </span>
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-0.5 lg:gap-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      prefetch={true}
                      className={`relative px-2.5 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-medium transition-all duration-300
                        flex items-center gap-1.5 lg:gap-2 group
                        ${isActive 
                          ? 'text-white' 
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                      <item.icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-primary-400' : 'group-hover:text-primary-400'} transition-colors`} />
                      <span className="relative z-10">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* User Menu */}
              <div className="flex items-center gap-3">
                {/* User Dropdown */}
                <div className="relative hidden sm:block">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/5 border border-white/10 
                      hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 
                      flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm font-bold">
                        {user?.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-neutral-300 max-w-[120px] truncate hidden lg:block">
                      {user?.email}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setIsUserMenuOpen(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-2 w-56 rounded-xl bg-neutral-900/95 backdrop-blur-2xl 
                            border border-white/10 shadow-2xl overflow-hidden z-50"
                        >
                          <div className="p-3 border-b border-white/10">
                            <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                            <p className="text-xs text-neutral-400">Free Plan</p>
                          </div>
                          <div className="p-2">
                            <Link
                              href="/dashboard/settings"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-3 px-3 py-2 rounded-lg text-neutral-300 
                                hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                              <User className="w-4 h-4" />
                              <span className="text-sm">Profile Settings</span>
                            </Link>
                            <button
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                setShowLogoutModal(true);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-error-500 
                                hover:bg-error-500/10 transition-all duration-200"
                            >
                              <LogOut className="w-4 h-4" />
                              <span className="text-sm">Logout</span>
                            </button>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Mobile menu button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 
                    hover:bg-white/10 transition-all duration-300"
                >
                  {isMobileMenuOpen ? (
                    <X className="w-5 h-5 text-white" />
                  ) : (
                    <Menu className="w-5 h-5 text-neutral-300" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="absolute top-16 left-0 right-0 bg-neutral-950/95 backdrop-blur-2xl 
                  border-b border-white/10 z-50 md:hidden"
              >
                <div className="p-4 space-y-2">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                          ${isActive 
                            ? 'bg-primary-500/10 text-primary-400 border border-primary-500/30' 
                            : 'text-neutral-400 hover:bg-white/5 hover:text-white border border-transparent'
                          }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                  
                  <div className="h-px bg-white/10 my-3" />
                  
                  {/* User info on mobile */}
                  <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 
                      flex items-center justify-center">
                      <span className="text-white font-bold">
                        {user?.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                      <p className="text-xs text-neutral-400">Free Plan</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-error-500 
                      border border-error-500/30 hover:bg-error-500/10 transition-all duration-300"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* Logout Modal */}
      <AnimatePresence>
        {showLogoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900/95 backdrop-blur-2xl p-6 rounded-2xl w-full max-w-sm 
                border border-white/20 shadow-2xl"
            >
              <h3 className="text-xl font-bold font-display gradient-text mb-2">Confirm Logout</h3>
              <p className="text-neutral-400 mb-6">Are you sure you want to logout?</p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setShowLogoutModal(false)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    handleLogout();
                    setShowLogoutModal(false);
                  }}
                >
                  Logout
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DashboardHeader;
