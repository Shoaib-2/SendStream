"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Send, Plus, Pencil, Clock, FileText, Sparkles, Trash2, Eye, ChevronLeft, ChevronRight, AlertTriangle, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { newsletterAPI } from '../../../services/api';
import Container from '@/components/UI/Container';
import GlassCard from '@/components/UI/GlassCard';
import Badge from '@/components/UI/Badge';
import Button from '@/components/UI/Button';
import AnimatedCounter from '@/components/UI/AnimatedCounter';

interface Newsletter {
  id?: string;
  _id?: string;
  title: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sent';
  sentDate?: string;
  scheduledDate?: string;
  createdAt?: string;
  contentQuality?: {
    isOriginalContent: boolean;
    hasResearchBacked: boolean;
    hasActionableInsights: boolean;
    contentLength: number;
    sources: string[];
    keyTakeaways: string[];
    qualityScore: number;
  };
}

type TabType = 'all' | 'sent' | 'draft' | 'scheduled';

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

const NewsletterDashboard = () => {
  const router = useRouter();
  const [newsletters, setNewsletters] = React.useState<Newsletter[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<TabType>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [deleteLoading, setDeleteLoading] = React.useState<string | null>(null);
  const [deleteModal, setDeleteModal] = React.useState<{ isOpen: boolean; newsletter: Newsletter | null }>({ 
    isOpen: false, 
    newsletter: null 
  });
  const itemsPerPage = 10;

  const fetchNewsletterStats = React.useCallback(async () => {
    try {
      const response = await newsletterAPI.getNewsletterStats();
      
      if (response && response.newsletters) {
        // Sort: most recent first (sent > scheduled > draft, then by date)
        const sorted = [...response.newsletters].sort((a, b) => {
          const getDate = (n: Newsletter) => {
            if (n.sentDate) return new Date(n.sentDate).getTime();
            if (n.scheduledDate) return new Date(n.scheduledDate).getTime();
            if (n.createdAt) return new Date(n.createdAt).getTime();
            return 0;
          };
          return getDate(b) - getDate(a);
        });
        setNewsletters(sorted);
      } else {
        setNewsletters([]);
      }
    } catch (_error) {
      setNewsletters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNewsletterStats();

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://backend-9h3q.onrender.com/ws';
    const ws = new WebSocket(`${wsUrl}`);
    
    ws.onopen = () => {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'newsletter_update') {
          fetchNewsletterStats();
        }
      };
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [fetchNewsletterStats]);

  const metrics = [
    { 
      id: 'total-newsletters', 
      label: 'Total Newsletters', 
      value: Array.isArray(newsletters) ? newsletters.length : 0, 
      icon: Mail,
      gradient: 'from-primary-500 to-primary-600',
      bgGradient: 'from-primary-500/20 to-primary-600/20'
    },
    { 
      id: 'sent-newsletters', 
      label: 'Sent', 
      value: Array.isArray(newsletters) ? newsletters.filter(n => n.status === 'sent').length : 0, 
      icon: Send,
      gradient: 'from-success-500 to-success-600',
      bgGradient: 'from-success-500/20 to-success-600/20'
    },
    { 
      id: 'draft-newsletters', 
      label: 'Drafts', 
      value: Array.isArray(newsletters) ? newsletters.filter(n => n.status === 'draft').length : 0, 
      icon: FileText,
      gradient: 'from-warning-500 to-warning-600',
      bgGradient: 'from-warning-500/20 to-warning-600/20'
    },
    { 
      id: 'scheduled-newsletters', 
      label: 'Scheduled', 
      value: Array.isArray(newsletters) ? newsletters.filter(n => n.status === 'scheduled').length : 0, 
      icon: Clock,
      gradient: 'from-secondary-500 to-secondary-600',
      bgGradient: 'from-secondary-500/20 to-secondary-600/20'
    }
  ];

  const handleCreateClick = () => {
    router.push('/dashboard/newsletters/create');
  };

  const handleDeleteClick = (newsletter: Newsletter, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModal({ isOpen: true, newsletter });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.newsletter) return;
    
    const newsletterId = deleteModal.newsletter.id || deleteModal.newsletter._id || '';
    setDeleteLoading(newsletterId);
    
    try {
      await newsletterAPI.deleteNewsletter(newsletterId);
      setNewsletters(prev => prev.filter(n => (n.id || n._id) !== newsletterId));
      setDeleteModal({ isOpen: false, newsletter: null });
    } catch (_error) {
      alert('Failed to delete newsletter. Please try again.');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleView = (newsletter: Newsletter, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/dashboard/newsletters/create?id=${newsletter.id || newsletter._id}&view=true`);
  };

  // Filter newsletters based on active tab
  const filteredNewsletters = React.useMemo(() => {
    if (activeTab === 'all') return newsletters;
    return newsletters.filter(n => n.status === activeTab);
  }, [newsletters, activeTab]);

  // Pagination
  const totalPages = Math.ceil(filteredNewsletters.length / itemsPerPage);
  const paginatedNewsletters = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredNewsletters.slice(start, start + itemsPerPage);
  }, [filteredNewsletters, currentPage]);

  // Reset to page 1 when tab changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: 'all', label: 'All', icon: Mail },
    { id: 'sent', label: 'Sent', icon: Send },
    { id: 'draft', label: 'Drafts', icon: FileText },
    { id: 'scheduled', label: 'Scheduled', icon: Clock },
  ];

  if (loading) {
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
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-display gradient-text mb-2">
              Newsletters
            </h1>
            <p className="text-neutral-400">Create, schedule, and manage your email campaigns</p>
          </div>
          <Button
            variant="gradient"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleCreateClick}
            className="w-full sm:w-auto group"
          >
            <span className="flex items-center gap-2">
              Create Newsletter
              <Sparkles className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
          </Button>
        </motion.div>

        {/* AI Feature Callout */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="default" padding="lg" className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border-purple-500/30">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center flex-shrink-0 border border-purple-500/40">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                  AI-Powered Content Generation
                  <Badge variant="success" size="sm">New</Badge>
                </h3>
                <p className="text-sm text-neutral-300 mb-3">
                  Create engaging, research-backed newsletters in seconds with our AI assistant. Generate content, improve writing, get subject line suggestions, and find the optimal send time.
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Smart Content Generation
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Subject Line Suggestions
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                    Optimal Send Time
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
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
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${metric.bgGradient} 
                      flex items-center justify-center border border-white/10
                      group-hover:scale-110 transition-transform duration-300`}>
                      <metric.icon className={`w-5 h-5 sm:w-6 sm:h-6 text-white`} />
                    </div>
                  </div>
                  <p className="text-neutral-400 text-xs sm:text-sm mb-1">{metric.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold font-display text-white">
                    <AnimatedCounter value={metric.value} />
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Newsletter Table */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="strong" padding="none" className="overflow-hidden">
            {/* Tabs */}
            <div className="px-4 sm:px-6 py-3 border-b border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-2 flex-wrap">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                        ${activeTab === tab.id
                          ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-glow'
                          : 'text-neutral-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                      {tab.id !== 'all' && (
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-white/10'}`}>
                          {newsletters.filter(n => n.status === tab.id).length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <Badge variant="default" size="sm">{filteredNewsletters.length} {activeTab === 'all' ? 'total' : activeTab}</Badge>
              </div>
            </div>
            
            {filteredNewsletters.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 
                  flex items-center justify-center border border-white/10">
                  <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {activeTab === 'all' ? 'No newsletters yet' : `No ${activeTab} newsletters`}
                </h3>
                <p className="text-neutral-400 mb-6">
                  {activeTab === 'all' ? 'Create your first newsletter to get started' : `You don't have any ${activeTab} newsletters yet`}
                </p>
                <Button variant="gradient" leftIcon={<Plus className="w-4 h-4" />} onClick={handleCreateClick}>
                  Create Newsletter
                </Button>
              </div>
            ) : (
              <>
                {/* Table Header - Hidden on mobile */}
                <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 border-b border-white/10 text-sm font-medium text-neutral-400">
                  <div className="col-span-5">Title</div>
                  <div className="col-span-2">Subject</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-white/10">
                  <AnimatePresence mode="popLayout">
                    {paginatedNewsletters.map((newsletter, index) => (
                      <motion.div
                        key={newsletter.id || newsletter._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.03 }}
                        className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 sm:px-6 py-4 
                          hover:bg-gradient-to-r hover:from-primary-500/5 hover:to-transparent 
                          transition-all duration-300 group"
                      >
                        {/* Title */}
                        <div className="md:col-span-5 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                            ${newsletter.status === 'sent' 
                              ? 'bg-success-500/20 text-success-400' 
                              : newsletter.status === 'scheduled'
                                ? 'bg-primary-500/20 text-primary-400'
                                : 'bg-warning-500/20 text-warning-400'
                            }`}>
                            {newsletter.status === 'sent' ? <Send className="w-5 h-5" /> :
                             newsletter.status === 'scheduled' ? <Clock className="w-5 h-5" /> :
                             <FileText className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-medium text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                              {newsletter.title}
                            </h3>
                            <p className="text-xs text-neutral-500 md:hidden mt-1 line-clamp-1">{newsletter.subject}</p>
                          </div>
                        </div>

                        {/* Subject - Desktop only */}
                        <div className="hidden md:flex md:col-span-2 items-center">
                          <p className="text-sm text-neutral-400 line-clamp-1">{newsletter.subject}</p>
                        </div>

                        {/* Status */}
                        <div className="md:col-span-2 flex items-center">
                          <Badge 
                            variant={
                              newsletter.status === 'sent' ? 'success' : 
                              newsletter.status === 'scheduled' ? 'primary' : 
                              'warning'
                            }
                            size="sm"
                          >
                            {newsletter.status.charAt(0).toUpperCase() + newsletter.status.slice(1)}
                          </Badge>
                        </div>

                        {/* Date */}
                        <div className="md:col-span-2 flex items-center">
                          <span className="text-sm text-neutral-400">
                            {newsletter.sentDate 
                              ? new Date(newsletter.sentDate).toLocaleDateString()
                              : newsletter.scheduledDate
                                ? new Date(newsletter.scheduledDate).toLocaleDateString()
                                : 'Draft'}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="md:col-span-1 flex items-center justify-end gap-2">
                          {newsletter.status === 'sent' ? (
                            <button
                              onClick={(e) => handleView(newsletter, e)}
                              className="p-2 text-neutral-400 hover:text-blue-400 transition-colors rounded-lg
                                hover:bg-blue-500/10 border border-transparent hover:border-blue-500/30"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => router.push(`/dashboard/newsletters/create?id=${newsletter.id || newsletter._id}`)}
                                className="p-2 text-neutral-400 hover:text-primary-400 transition-colors rounded-lg
                                  hover:bg-primary-500/10 border border-transparent hover:border-primary-500/30"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteClick(newsletter, e)}
                                disabled={deleteLoading === (newsletter.id || newsletter._id)}
                                className="p-2 text-neutral-400 hover:text-red-400 transition-colors rounded-lg
                                  hover:bg-red-500/10 border border-transparent hover:border-red-500/30
                                  disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete"
                              >
                                {deleteLoading === (newsletter.id || newsletter._id) ? (
                                  <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                    <p className="text-sm text-neutral-400">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredNewsletters.length)} of {filteredNewsletters.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 
                          disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 rounded-lg text-sm transition-all
                              ${currentPage === page
                                ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white'
                                : 'text-neutral-400 hover:text-white hover:bg-white/5'
                              }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 
                          disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteModal({ isOpen: false, newsletter: null })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative"
            >
              <GlassCard variant="strong" padding="lg" className="w-full max-w-md border-white/20 shadow-2xl">
                {/* Close Button */}
                <button
                  onClick={() => setDeleteModal({ isOpen: false, newsletter: null })}
                  className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white transition-colors
                    rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-4 text-red-400">
                  <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center border border-red-500/30">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-white">Delete Newsletter</h3>
                </div>

                {/* Content */}
                <p className="text-neutral-300 mb-2">
                  Are you sure you want to delete <span className="font-semibold text-white">&quot;{deleteModal.newsletter?.title}&quot;</span>?
                </p>
                <p className="text-sm text-neutral-400 mb-6">
                  This action cannot be undone. The newsletter and all its data will be permanently removed.
                </p>

                {/* Actions */}
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setDeleteModal({ isOpen: false, newsletter: null })}
                    disabled={!!deleteLoading}
                  >
                    Cancel
                  </Button>

                  <Button
                    variant="danger"
                    onClick={handleDeleteConfirm}
                    disabled={!!deleteLoading}
                    leftIcon={deleteLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  >
                    {deleteLoading ? 'Deleting...' : 'Delete Newsletter'}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Container>
  );
};

export default NewsletterDashboard;