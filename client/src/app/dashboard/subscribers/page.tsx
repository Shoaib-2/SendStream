"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Upload, Download, Search, Users, UserPlus, UserCheck, UserMinus, X } from 'lucide-react';
import { exportSubscribers } from '../../../utils/csvHandler';
import { useData } from '../../../context/dataContext';
import { subscriberAPI } from '../../../services/api';
import { Subscriber } from '../../../types';
import Container from '@/components/UI/Container';
import GlassCard from '@/components/UI/GlassCard';
import Badge from '@/components/UI/Badge';
import Button from '@/components/UI/Button';
import AnimatedCounter from '@/components/UI/AnimatedCounter';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
};

export default function SubscribersPage() {
  console.log('[SubscribersPage] Component rendering');
  
  const { subscribers, addSubscriber, removeSubscriber, isLoading } = useData();
  const [selectedSubscribers, setSelectedSubscribers] = useState<string[]>([]);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSubscribers, setFilteredSubscribers] = useState<Subscriber[]>(subscribers);
  const [currentPage, setCurrentPage] = useState(1);
  const [subscribersPerPage] = useState(10);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState('success');
  const [role] = useState('admin');
  
  useEffect(() => {
    console.log('[SubscribersPage] Mounted, subscribers count:', subscribers.length);
  }, [subscribers]);

  useEffect(() => {
    const filtered = searchQuery
      ? subscribers.filter(subscriber =>
          subscriber.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          subscriber.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : subscribers;
    setFilteredSubscribers(filtered);
  }, [searchQuery, subscribers]);

  const showNotificationMessage = (message: string, type: string) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        await subscriberAPI.import(file);
        showNotificationMessage('Import successful', 'success');
      } catch {
        showNotificationMessage('Import failed', 'error');
      }
    }
  };

  const handleExport = () => {
    exportSubscribers(subscribers);
    showNotificationMessage('Export successful', 'success');
  };

  const handleBulkDelete = async () => {
    try {
      await subscriberAPI.bulkDelete(selectedSubscribers);
      setFilteredSubscribers(prev => prev.filter(sub => !selectedSubscribers.includes(sub.id)));
      setSelectedSubscribers([]);
      showNotificationMessage('Bulk delete successful', 'success');
    } catch {
      showNotificationMessage('Bulk delete failed', 'error');
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const indexOfLastSubscriber = currentPage * subscribersPerPage;
  const indexOfFirstSubscriber = indexOfLastSubscriber - subscribersPerPage;
  const currentSubscribers = filteredSubscribers.slice(indexOfFirstSubscriber, indexOfLastSubscriber);

  const activeCount = subscribers.filter(s => s.status === 'active').length;
  const inactiveCount = subscribers.filter(s => s.status !== 'active').length;

  const metrics = [
    { 
      id: 'total', 
      label: 'Total Subscribers', 
      value: subscribers.length, 
      icon: Users,
      gradient: 'from-primary-500 to-primary-600',
      bgGradient: 'from-primary-500/20 to-primary-600/20'
    },
    { 
      id: 'active', 
      label: 'Active', 
      value: activeCount, 
      icon: UserCheck,
      gradient: 'from-success-500 to-success-600',
      bgGradient: 'from-success-500/20 to-success-600/20'
    },
    { 
      id: 'inactive', 
      label: 'Inactive', 
      value: inactiveCount, 
      icon: UserMinus,
      gradient: 'from-error-500 to-error-600',
      bgGradient: 'from-error-500/20 to-error-600/20'
    },
    { 
      id: 'new', 
      label: 'This Month', 
      value: subscribers.filter(s => {
        const subDate = new Date(s.subscribed);
        const now = new Date();
        return subDate.getMonth() === now.getMonth() && subDate.getFullYear() === now.getFullYear();
      }).length, 
      icon: UserPlus,
      gradient: 'from-secondary-500 to-secondary-600',
      bgGradient: 'from-secondary-500/20 to-secondary-600/20'
    }
  ];

  const SubscribeModal = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [errors, setErrors] = useState<{ email?: string; name?: string }>({});

    const validate = () => {
      const newErrors: { email?: string; name?: string } = {};
      if (!email) newErrors.email = 'Email is required';
      if (!name) newErrors.name = 'Name is required';
      return newErrors;
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const validationErrors = validate();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      const newSubscriber: Omit<Subscriber, 'id'> = {
        email,
        name,
        status: 'active',
        subscribed: new Date().toISOString()
      };

      addSubscriber(newSubscriber);
      setShowSubscribeModal(false);
      showNotificationMessage('Subscriber added successfully', 'success');
    };

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative"
        >
          <GlassCard variant="strong" padding="xl" className="w-full max-w-md">
            <button 
              onClick={() => setShowSubscribeModal(false)}
              className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white transition-colors
                hover:bg-white/10 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 
                flex items-center justify-center border border-primary-500/30">
                <UserPlus className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-display text-white">Add Subscriber</h2>
                <p className="text-sm text-neutral-400">Add a new subscriber to your list</p>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block font-medium text-sm text-neutral-200">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-900/50 rounded-xl border border-white/10
                    focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50 focus:outline-none text-sm
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="subscriber@example.com"
                />
                {errors.email && <p className="text-error-400 text-xs">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="block font-medium text-sm text-neutral-200">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-900/50 rounded-xl border border-white/10
                    focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50 focus:outline-none text-sm
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="John Doe"
                />
                {errors.name && <p className="text-error-400 text-xs">{errors.name}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowSubscribeModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                >
                  Add Subscriber
                </Button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      </motion.div>
    );
  };

  const renderActions = (subscriber: Subscriber) => (
    <div className="flex justify-center">
      <button
        onClick={() => removeSubscriber(subscriber.id)}
        className="text-neutral-400 hover:text-error-400 transition-colors p-2 hover:bg-error-500/10 
          rounded-lg border border-transparent hover:border-error-500/30"
        aria-label="Delete subscriber"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 blur-xl" />
        </div>
      </div>
    );
  }

  return (
    <Container size="xl" className="py-8 min-h-screen">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Notification */}
        <AnimatePresence>
          {showNotification && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50"
            >
              <Badge 
                variant={notificationType === 'success' ? 'success' : 'error'}
                size="lg"
                className="shadow-glow-lg px-4 py-2"
              >
                {notificationMessage}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-display gradient-text mb-2">
              Subscribers
            </h1>
            <p className="text-neutral-400">Manage and grow your email list</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="gradient"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setShowSubscribeModal(true)}
            >
              Add Subscriber
            </Button>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              <GlassCard variant="default" padding="lg" className="group relative overflow-hidden">
                <div className={`absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br ${metric.bgGradient} rounded-full blur-2xl 
                  group-hover:scale-150 transition-transform duration-500`} />
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${metric.bgGradient} 
                      flex items-center justify-center border border-white/10
                      group-hover:scale-110 transition-transform duration-300`}>
                      <metric.icon className={`w-6 h-6 text-white`} />
                    </div>
                  </div>
                  <p className="text-neutral-400 text-sm mb-1">{metric.label}</p>
                  <p className="text-3xl font-bold font-display text-white">
                    <AnimatedCounter value={metric.value} />
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Actions Row */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-11 bg-neutral-900/50 rounded-xl border border-white/10
                focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50 transition-all duration-200
                text-white placeholder:text-neutral-500"
            />
            <Search className="absolute top-1/2 transform -translate-y-1/2 left-4 w-4 h-4 text-neutral-400" />
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer">
              <Button
                variant="secondary"
                leftIcon={<Upload className="w-4 h-4" />}
                className="pointer-events-none"
              >
                Import CSV
              </Button>
              <input type="file" className="hidden" accept=".csv" onChange={handleImport} />
            </label>
            
            <Button
              variant="secondary"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExport}
            >
              Export
            </Button>
            
            {role === 'admin' && selectedSubscribers.length > 0 && (
              <Button
                variant="danger"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={handleBulkDelete}
              >
                Delete ({selectedSubscribers.length})
              </Button>
            )}
          </div>
        </motion.div>

        {/* Subscribers Table */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="strong" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-4 py-4 text-left">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            const validIds = filteredSubscribers
                              .filter(sub => sub.id && typeof sub.id === 'string')
                              .map(sub => sub.id);
                            setSelectedSubscribers(validIds);
                          } else {
                            setSelectedSubscribers([]);
                          }
                        }}
                        checked={selectedSubscribers.length === filteredSubscribers.length && filteredSubscribers.length > 0}
                        className="rounded border-neutral-600 text-primary-500 focus:ring-primary-500/50 cursor-pointer
                          w-4 h-4"
                      />
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Subscriber
                    </th>
                    <th className="hidden md:table-cell px-4 py-4 text-left text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Subscribed
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-4 text-center text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentSubscribers.length > 0 ? (
                    currentSubscribers.map((subscriber, index) => (
                      <motion.tr 
                        key={subscriber.id || `subscriber-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="hover:bg-gradient-to-r hover:from-primary-500/5 hover:to-transparent 
                          transition-all duration-300 group"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedSubscribers.includes(subscriber.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSubscribers([...selectedSubscribers, subscriber.id]);
                              } else {
                                setSelectedSubscribers(selectedSubscribers.filter(id => id !== subscriber.id));
                              }
                            }}
                            className="rounded border-neutral-600 text-primary-500 focus:ring-primary-500/50 cursor-pointer
                              w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 
                              flex items-center justify-center border border-white/10 flex-shrink-0
                              group-hover:scale-105 transition-transform duration-300">
                              <span className="text-sm font-semibold text-primary-300">
                                {subscriber.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-white group-hover:text-primary-300 transition-colors">
                                {subscriber.name}
                              </p>
                              <p className="text-sm text-neutral-400">{subscriber.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-4 py-4 whitespace-nowrap text-neutral-400 text-sm">
                          {new Date(subscriber.subscribed).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge 
                            variant={subscriber.status === 'active' ? 'success' : 'error'}
                            size="sm"
                          >
                            {subscriber.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {renderActions(subscriber)}
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 
                            flex items-center justify-center border border-white/10">
                            <Users className="w-8 h-8 text-primary-400" />
                          </div>
                          <p className="text-neutral-400">No subscribers found</p>
                          <Button variant="gradient" size="sm" onClick={() => setShowSubscribeModal(true)}>
                            Add your first subscriber
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </motion.div>

        {/* Pagination */}
        {filteredSubscribers.length > subscribersPerPage && (
          <motion.div variants={itemVariants} className="flex justify-center gap-2">
            {Array.from({ length: Math.ceil(filteredSubscribers.length / subscribersPerPage) }).map((_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={`page-${pageNumber}`}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`min-w-[40px] h-[40px] flex items-center justify-center rounded-xl 
                    transition-all duration-200 text-sm font-medium ${
                    currentPage === pageNumber
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                      : 'bg-white/5 text-neutral-400 hover:bg-white/10 border border-white/10 hover:border-primary-500/30'
                  }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </motion.div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showSubscribeModal && <SubscribeModal />}
        </AnimatePresence>
      </motion.div>
    </Container>
  );
}
