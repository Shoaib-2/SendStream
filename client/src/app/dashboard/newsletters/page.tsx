"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, Plus, Pencil, Clock, FileText, Sparkles } from 'lucide-react';
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
  status: 'draft' | 'scheduled' | 'sent';
  sentDate?: string;
  scheduledDate?: string;
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

  const fetchNewsletterStats = React.useCallback(async () => {
    try {
      const response = await newsletterAPI.getNewsletterStats();
      
      if (response && response.newsletters) {
        setNewsletters(response.newsletters);
      } else {
        console.error('Invalid response format:', response);
        setNewsletters([]);
      }
    } catch (error) {
      console.error('Error fetching newsletters:', error);
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

        {/* Newsletter List */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="strong" padding="none" className="overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold font-display text-white">Recent Newsletters</h2>
              <Badge variant="default" size="sm">{newsletters.length} total</Badge>
            </div>
            
            {newsletters.length === 0 ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 
                  flex items-center justify-center border border-white/10">
                  <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No newsletters yet</h3>
                <p className="text-neutral-400 mb-6">Create your first newsletter to get started</p>
                <Button variant="gradient" leftIcon={<Plus className="w-4 h-4" />} onClick={handleCreateClick}>
                  Create Newsletter
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {newsletters.map((newsletter, index) => (
                  <motion.div
                    key={newsletter.id || newsletter._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 sm:p-6 hover:bg-gradient-to-r hover:from-primary-500/5 hover:to-transparent 
                      transition-all duration-300 cursor-pointer group"
                    onClick={() => newsletter.status === 'draft' && 
                      router.push(`/dashboard/newsletters/create?id=${newsletter.id || newsletter._id}`)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-4">
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
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-neutral-400">
                            {newsletter.scheduledDate && (
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-primary-400" />
                                Scheduled: {new Date(newsletter.scheduledDate).toLocaleString()}
                              </span>
                            )}
                            {newsletter.sentDate && (
                              <span className="flex items-center gap-1.5">
                                <Send className="w-3.5 h-3.5 text-success-400" />
                                Sent: {new Date(newsletter.sentDate).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 ml-14 sm:ml-0">
                        {(newsletter.status === 'draft' || newsletter.status === 'scheduled') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/dashboard/newsletters/create?id=${newsletter.id || newsletter._id}`);
                            }}
                            className="p-2 text-neutral-400 hover:text-primary-400 transition-colors rounded-lg
                              hover:bg-primary-500/10 border border-transparent hover:border-primary-500/30"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
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
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </motion.div>
    </Container>
  );
};

export default NewsletterDashboard;