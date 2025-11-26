"use client";
import React, { useEffect, useState } from 'react';
import { motion, Variants } from 'framer-motion';
import { Users, Mail, Star, BookOpen, Send, TrendingUp, TrendingDown, Zap, Sparkles } from 'lucide-react';
import { useData } from '@/context/dataContext';
import { newsletterAPI } from '@/services/api';
import type { Newsletter } from '@/types';
import ExpiredSubscription from '@/components/subscription/ExpiredSubscription';
import { emailAPI } from '@/services/api';
import { useSubscription } from '@/context/subscriptionContext';
import GlassCard from '@/components/UI/GlassCard';
import Badge from '@/components/UI/Badge';
import Container from '@/components/UI/Container';
import AnimatedCounter from '@/components/UI/AnimatedCounter';
import { PageSkeleton } from '@/components/UI/Skeleton';

interface QualityMetrics {
  originalContent: boolean;
  researchBased: boolean;
  actionableInsights: boolean;
  comprehensiveAnalysis: boolean;
}

interface EmailUsage {
  emailsSent: number;
  dailyLimit: number;
  remainingEmails: number;
  percentUsed: number;
}

// Animation variants with proper typing
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 }
  }
};

// Animated Progress Ring Component
const ProgressRing: React.FC<{ 
  value: number; 
  max: number; 
  size?: number;
  strokeWidth?: number;
  color?: string;
}> = ({ value, max, size = 120, strokeWidth = 8, color = 'primary' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min((value / max) * 100, 100);
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const colors: Record<string, string> = {
    primary: 'stroke-primary-500',
    secondary: 'stroke-secondary-500',
    success: 'stroke-success-500',
    warning: 'stroke-warning-500',
    error: 'stroke-error-500',
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="stroke-white/10 fill-none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={`${colors[color]} fill-none`}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">
          <AnimatedCounter value={Math.round(progress)} suffix="%" />
        </span>
        <span className="text-xs text-neutral-400">{value}/{max}</span>
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { subscribers } = useData();
  const { status, isRenewalRequired, loading: subscriptionLoading } = useSubscription();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailUsage, setEmailUsage] = useState<EmailUsage>({
    emailsSent: 0,
    dailyLimit: 100,
    remainingEmails: 100,
    percentUsed: 0
  });

  useEffect(() => {
    const fetchEmailUsage = async () => {
      try {
        if (isRenewalRequired || status === 'UNKNOWN' || status === 'CHECKING') return;
        const data = await emailAPI.getUsage();
        if (data) {
          const { emailsSent, dailyLimit } = data;
          const remainingEmails = Math.max(0, dailyLimit - emailsSent);
          const percentUsed = (emailsSent / dailyLimit) * 100;
          setEmailUsage({ emailsSent, dailyLimit, remainingEmails, percentUsed });
        }
      } catch {
        setEmailUsage({ emailsSent: 0, dailyLimit: 100, remainingEmails: 100, percentUsed: 0 });
      }
    };
    fetchEmailUsage();
    const intervalId = setInterval(fetchEmailUsage, 60000);
    return () => clearInterval(intervalId);
  }, [isRenewalRequired, status]);

  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        if (isRenewalRequired || status === 'UNKNOWN' || status === 'CHECKING') {
          setLoading(false);
          return;
        }
        setLoading(true);
        const data = await newsletterAPI.getAll();
        if (data) {
          setNewsletters(data);
          setQualityMetrics(data.map(newsletter => ({
            originalContent: newsletter.contentQuality?.isOriginalContent || false,
            researchBased: newsletter.contentQuality?.hasResearchBacked || false,
            actionableInsights: newsletter.contentQuality?.hasActionableInsights || false,
            comprehensiveAnalysis: newsletter.contentQuality?.contentLength ? newsletter.contentQuality.contentLength > 500 : false
          })));
        }
      } catch {
        setNewsletters([]);
        setQualityMetrics([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNewsletters();
  }, [isRenewalRequired, status]);

  const renderContent = () => {
    if (loading || subscriptionLoading || status === 'CHECKING') {
      return (
        <Container size="xl" className="py-8 min-h-screen">
          <PageSkeleton />
        </Container>
      );
    }
    
    if (isRenewalRequired) {
      return <ExpiredSubscription />;
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sentNewsletters = newsletters.filter(n => n.status === 'sent');
    const recentNewsletters = sentNewsletters.filter(n =>
      n.sentDate && new Date(n.sentDate) > thirtyDaysAgo
    );
    const recentSubscribers = subscribers.filter(s =>
      new Date(s.subscribed) > thirtyDaysAgo
    );
    const activeSubscribers = subscribers.filter(s => s.status === 'active');

    const getQualityScore = (newsletter: Newsletter) => {
      return newsletter.contentQuality?.qualityScore || 0;
    };

    const averageQualityScore = newsletters.length > 0 ? 
      newsletters.reduce((acc, curr) => acc + getQualityScore(curr), 0) / newsletters.length : 0;

    const metrics = [
      {
        label: 'Total Subscribers',
        value: activeSubscribers.length,
        change: recentSubscribers.length,
        changeLabel: 'this month',
        icon: Users,
        color: 'primary',
        positive: recentSubscribers.length > 0
      },
      {
        label: 'Newsletters Sent',
        value: sentNewsletters.length,
        change: recentNewsletters.length,
        changeLabel: 'this month',
        icon: Mail,
        color: 'secondary',
        positive: recentNewsletters.length > 0
      },
      {
        label: 'Avg. Quality Score',
        value: Math.round(averageQualityScore),
        suffix: '%',
        change: null,
        changeLabel: 'overall',
        icon: Star,
        color: 'warning',
        positive: averageQualityScore > 70
      },
      {
        label: 'Research Backed',
        value: qualityMetrics.filter(m => m.researchBased).length,
        change: qualityMetrics.length > 0 
          ? Math.round((qualityMetrics.filter(m => m.researchBased).length / qualityMetrics.length) * 100)
          : 0,
        suffix: '%',
        changeLabel: 'of total',
        icon: BookOpen,
        color: 'accent',
        positive: true
      }
    ];

    return (
      <Container size="xl" className="py-8 min-h-screen">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display gradient-text mb-2">
                Dashboard
              </h1>
              <p className="text-neutral-400">Track your newsletter performance and content metrics</p>
            </div>
            <Badge variant="success" size="lg" className="w-fit">
              <Zap className="w-4 h-4 mr-1" />
              Active Subscription
            </Badge>
          </motion.div>
          
          {/* AI Feature Highlight */}
          <motion.div variants={itemVariants}>
            <GlassCard variant="default" padding="md" className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 border-purple-500/30">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center border border-purple-500/40">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      AI-Powered Newsletter Creation
                      <Badge variant="success" size="sm">New</Badge>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Generate engaging content, optimize send times, and create compelling subject lines with AI
                    </p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
          
          {/* Email Usage Card */}
          <motion.div variants={itemVariants}>
            <GlassCard variant="strong" className="relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-secondary-500/20 rounded-full blur-3xl" />
              
              <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-2xl blur-lg opacity-50" />
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary-500 to-secondary-600 
                      flex items-center justify-center">
                      <Send className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold font-display text-white mb-1">Daily Email Quota</h2>
                    <p className="text-neutral-400">
                      <span className="text-white font-semibold">{emailUsage.remainingEmails}</span> of {emailUsage.dailyLimit} emails remaining
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <ProgressRing 
                    value={emailUsage.emailsSent} 
                    max={emailUsage.dailyLimit}
                    color={emailUsage.percentUsed > 80 ? 'error' : emailUsage.percentUsed > 50 ? 'warning' : 'success'}
                  />
                  <Badge 
                    variant={emailUsage.percentUsed > 80 ? 'warning' : 'secondary'} 
                    size="md"
                  >
                    Resets at midnight
                  </Badge>
                </div>
              </div>
            </GlassCard>
          </motion.div>
          
          {/* Metrics Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {metrics.map((metric, index) => (
              <GlassCard 
                key={index}
                variant="default"
                padding="lg"
                className="group relative overflow-hidden"
              >
                <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-0 
                  group-hover:opacity-30 transition-opacity duration-500
                  ${metric.color === 'primary' ? 'bg-primary-500' : 
                    metric.color === 'secondary' ? 'bg-secondary-500' : 
                    metric.color === 'warning' ? 'bg-warning-500' : 'bg-accent-500'}`} 
                />
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center 
                      transition-transform duration-300 group-hover:scale-110
                      ${metric.color === 'primary' ? 'bg-primary-500/10' : 
                        metric.color === 'secondary' ? 'bg-secondary-500/10' : 
                        metric.color === 'warning' ? 'bg-warning-500/10' : 'bg-accent-500/10'}`}>
                      <metric.icon className={`w-5 h-5 sm:w-6 sm:h-6
                        ${metric.color === 'primary' ? 'text-primary-400' : 
                          metric.color === 'secondary' ? 'text-secondary-400' : 
                          metric.color === 'warning' ? 'text-warning-400' : 'text-accent-400'}`} 
                      />
                    </div>
                    {metric.change !== null && (
                      <div className={`flex items-center gap-1 text-sm
                        ${metric.positive ? 'text-success-500' : 'text-neutral-400'}`}>
                        {metric.positive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        <span>{metric.change}{metric.suffix || ''}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-neutral-400 text-xs sm:text-sm font-medium mb-1">{metric.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold font-display text-white">
                    <AnimatedCounter value={metric.value} suffix={metric.suffix} />
                  </p>
                  <p className="text-[10px] sm:text-xs text-neutral-500 mt-1">{metric.changeLabel}</p>
                </div>
              </GlassCard>
            ))}
          </motion.div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Content Quality Distribution */}
            <motion.div variants={itemVariants}>
              <GlassCard variant="default" className="h-full">
                <h2 className="text-base sm:text-lg font-semibold font-display text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400" />
                  </div>
                  Content Quality Breakdown
                </h2>
                
                <div className="space-y-4">
                  {[
                    { label: 'Original Content', value: qualityMetrics.filter(m => m.originalContent).length, total: qualityMetrics.length, color: 'primary' },
                    { label: 'Research Based', value: qualityMetrics.filter(m => m.researchBased).length, total: qualityMetrics.length, color: 'secondary' },
                    { label: 'Actionable Insights', value: qualityMetrics.filter(m => m.actionableInsights).length, total: qualityMetrics.length, color: 'accent' },
                  ].map((item, index) => {
                    const percent = item.total > 0 ? (item.value / item.total) * 100 : 0;
                    return (
                      <div key={index} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-neutral-300">{item.label}</span>
                          <span className="text-sm font-medium text-white">{item.value}/{item.total}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percent}%` }}
                            transition={{ duration: 1, delay: index * 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className={`h-full rounded-full ${
                              item.color === 'primary' ? 'bg-gradient-to-r from-primary-500 to-primary-400' :
                              item.color === 'secondary' ? 'bg-gradient-to-r from-secondary-500 to-secondary-400' :
                              'bg-gradient-to-r from-accent-500 to-accent-400'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {qualityMetrics.length === 0 && (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                    <p className="text-neutral-400">No content metrics yet</p>
                    <p className="text-sm text-neutral-500 mt-1">Send newsletters to see quality breakdown</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>

            {/* Latest Newsletters */}
            <motion.div variants={itemVariants}>
              <GlassCard variant="default" className="h-full">
                <h2 className="text-base sm:text-lg font-semibold font-display text-white mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary-500/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-400" />
                  </div>
                  Recent Newsletters
                </h2>
                
                <div className="space-y-3">
                  {newsletters.slice(0, 4).map((newsletter, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/5
                        hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300 group"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-white truncate group-hover:text-primary-300 transition-colors">
                            {newsletter.title}
                          </h3>
                          <p className="text-xs text-neutral-500 mt-1">
                            {newsletter.sentDate 
                              ? new Date(newsletter.sentDate).toLocaleDateString('en-US', { 
                                  month: 'short', day: 'numeric', year: 'numeric' 
                                })
                              : 'Draft'}
                          </p>
                        </div>
                        <Badge 
                          variant={newsletter.status === 'sent' ? 'success' : newsletter.status === 'scheduled' ? 'warning' : 'secondary'} 
                          size="sm"
                        >
                          {newsletter.status}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                  
                  {newsletters.length === 0 && (
                    <div className="text-center py-8">
                      <Mail className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
                      <p className="text-neutral-400">No newsletters yet</p>
                      <p className="text-sm text-neutral-500 mt-1">Create your first newsletter to get started</p>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </motion.div>
      </Container>
    );
  };

  return renderContent();
}
