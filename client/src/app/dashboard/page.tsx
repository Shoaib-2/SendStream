"use client";
import React, { useEffect, useState } from 'react';
import { Users, Mail, Star, BookOpen, Send } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useData } from '@/context/dataContext';
import { newsletterAPI } from '@/services/api';
import type { Newsletter } from '@/types';
import ExpiredSubscription from '@/components/subscription/ExpiredSubscription';
import { emailAPI } from '@/services/api';
import { useSubscription } from '@/context/subscriptionContext';
import Card from '@/components/UI/Card';
import Badge from '@/components/UI/Badge';
import Container from '@/components/UI/Container';

// Lazy load heavy chart component
const ResponsivePie = dynamic(
  () => import('@nivo/pie').then(mod => mod.ResponsivePie),
  { 
    ssr: false,
    loading: () => <div className="h-64 flex items-center justify-center">Loading chart...</div>
  }
);

const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B'];

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

export default function DashboardPage() {
  console.log('[DashboardPage] ========== RENDERING ==========');
  const { subscribers } = useData();
  const { status, isRenewalRequired, loading: subscriptionLoading } = useSubscription();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics[]>([]);
  // Initialize loading to false - we'll set it to true only when actively fetching
  const [loading, setLoading] = useState(false);
  const [emailUsage, setEmailUsage] = useState<EmailUsage>({
    emailsSent: 0,
    dailyLimit: 100,
    remainingEmails: 100,
    percentUsed: 0
  });

  console.log('[DashboardPage] State:', { subscribersCount: subscribers?.length, status, isRenewalRequired });

  // Debug logging
  useEffect(() => {
    console.log('[DashboardPage] State:', { 
      status, 
      isRenewalRequired, 
      subscriptionLoading, 
      localLoading: loading 
    });
  }, [status, isRenewalRequired, subscriptionLoading, loading]);

  // Fetch email usage stats
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

  // Fetch newsletters
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

  // Content rendering logic
  const renderContent = () => {
    if (loading || subscriptionLoading || status === 'CHECKING') {
      return (
        <Container size="xl" className="py-20 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-neutral-400">Loading your dashboard...</p>
          </div>
        </Container>
      );
    }
    if (isRenewalRequired) {
      return <ExpiredSubscription />;
    }
    
    // Prepare data for charts
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

    // Calculate content quality scores
    const getQualityScore = (newsletter: Newsletter) => {
      return newsletter.contentQuality?.qualityScore || 0;
    };

    const averageQualityScore = newsletters.length > 0 ? 
      newsletters.reduce((acc, curr) => acc + getQualityScore(curr), 0) / newsletters.length : 0;

    const metrics = [
      {
        label: 'Total Subscribers',
        value: activeSubscribers.length,
        change: activeSubscribers.length - recentSubscribers.length > 0
          ? `${(((recentSubscribers.length - (activeSubscribers.length - recentSubscribers.length)) / 
              (activeSubscribers.length - recentSubscribers.length)) * 100).toFixed(1)}%`
          : recentSubscribers.length > 0 ? '100%' : '0%',
        icon: Users,
        color: 'text-blue-500'
      },
      {
        label: 'Newsletters Sent',
        value: sentNewsletters.length,
        change: sentNewsletters.length - recentNewsletters.length > 0
          ? `${(((recentNewsletters.length - (sentNewsletters.length - recentNewsletters.length)) / 
              (sentNewsletters.length - recentNewsletters.length)) * 100).toFixed(1)}%`
          : recentNewsletters.length > 0 ? '100%' : '0%',
        icon: Mail,
        color: 'text-green-500'
      },
      {
        label: 'Content Quality',
        value: `${averageQualityScore.toFixed(0)}%`,
        change: newsletters.length > 1
          ? `${(((averageQualityScore - (newsletters.slice(0, -1).reduce((acc, curr) => acc + getQualityScore(curr), 0) / (newsletters.length - 1))) / 
              (newsletters.slice(0, -1).reduce((acc, curr) => acc + getQualityScore(curr), 0) / (newsletters.length - 1))) * 100).toFixed(1)}%`
          : '0%',
        icon: Star,
        color: 'text-yellow-500'
      },
      {
        label: 'Research Score',
        value: qualityMetrics.filter(m => m.researchBased).length,
        change: qualityMetrics.length > 0
          ? `${((qualityMetrics.filter(m => m.researchBased).length / qualityMetrics.length) * 100).toFixed(1)}%`
          : '0%',
        icon: BookOpen,
        color: 'text-purple-500'
      }
    ];

    const newsletterData = [
      { name: 'Original', value: qualityMetrics.filter(m => m.originalContent).length },
      { name: 'Research-Based', value: qualityMetrics.filter(m => m.researchBased).length },
      { name: 'Actionable', value: qualityMetrics.filter(m => m.actionableInsights).length }
    ];

    return (
      <Container size="xl" className="py-8 min-h-screen">
        <div className="space-y-8 animate-fade-in-up">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-display gradient-text mb-2">
                Content Quality Dashboard
              </h1>
              <p className="text-neutral-400">Track your newsletter performance and content metrics</p>
            </div>
            <Badge variant="primary" size="lg" className="w-fit">
              <Send className="w-4 h-4 mr-1" />
              Active Subscription
            </Badge>
          </div>
          
          {/* Email Sending Limits Card */}
          <Card variant="hover" className="group">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-secondary-500 to-secondary-600 
                  flex items-center justify-center shadow-glow-cyan group-hover:scale-110 transition-transform">
                  <Send className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold font-display text-white mb-1">Email Sending Limits</h2>
                  <p className="text-neutral-400">
                    {emailUsage.remainingEmails} of {emailUsage.dailyLimit} emails remaining today
                  </p>
                </div>
              </div>
              
              <Badge 
                variant={emailUsage.percentUsed > 80 ? 'warning' : 'secondary'} 
                size="lg"
              >
                Resets at midnight
              </Badge>
            </div>
            
            <div className="w-full bg-neutral-800/50 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  emailUsage.percentUsed > 80 ? 'bg-gradient-to-r from-error-500 to-error-600' : 
                  emailUsage.percentUsed > 50 ? 'bg-gradient-to-r from-warning-500 to-warning-600' : 
                  'bg-gradient-to-r from-success-500 to-success-600'
                }`} 
                style={{ width: `${emailUsage.percentUsed}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between mt-3 text-sm">
              <span className="text-neutral-400">{emailUsage.emailsSent} used</span>
              <span className="text-neutral-400">{emailUsage.remainingEmails} remaining</span>
            </div>
          </Card>
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((metric, index) => (
              <Card 
                key={index}
                variant="hover"
                className="group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/0 via-accent-500/0 to-secondary-500/0 
                  group-hover:from-primary-500/5 group-hover:via-accent-500/5 group-hover:to-secondary-500/5 
                  transition-all duration-500 rounded-2xl" />
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                      index === 0 ? 'from-primary-500 to-primary-600' :
                      index === 1 ? 'from-secondary-500 to-secondary-600' :
                      index === 2 ? 'from-accent-500 to-accent-600' :
                      'from-purple-500 to-purple-600'
                    } flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-glow`}>
                      <metric.icon className="w-6 h-6 text-white" />
                    </div>
                    <Badge 
                      variant={parseFloat(metric.change) >= 0 ? 'success' : 'error'}
                      size="sm"
                    >
                      {metric.change}
                    </Badge>
                  </div>
                  <p className="text-neutral-400 text-sm font-medium mb-2">{metric.label}</p>
                  <p className="text-3xl font-bold font-display gradient-text">{metric.value}</p>
                </div>
              </Card>
            ))}
          </div>
            {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card variant="hover" className="group">
              <h2 className="text-xl font-semibold font-display text-white mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-primary-400" />
                </div>
                Content Quality Distribution
              </h2>
              <div className="relative h-[320px]">
                <ResponsivePie
                  data={newsletterData.map(d => ({
                    id: d.name,
                    value: d.value,
                    label: d.name,
                    color: COLORS[newsletterData.indexOf(d) % COLORS.length]
                  }))}
                  theme={{
                    text: {
                      fontSize: 11,
                      fill: '#94a3b8'
                    },
                    legends: {
                      text: {
                        fontSize: 11,
                        fill: '#94a3b8'
                      }
                    }
                  }}
                  margin={{ top: 10, right: 20, bottom: 60, left: 20 }}
                  innerRadius={0.6}
                  padAngle={0.5}
                  cornerRadius={3}
                  activeOuterRadiusOffset={8}
                  colors={{ datum: 'data.color' }}
                  borderWidth={1}
                  borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
                  enableArcLabels={true}
                  arcLabelsSkipAngle={10}
                  arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                  legends={[{
                    anchor: 'bottom',
                    direction: 'row',
                    justify: false,
                    translateY: 50,
                    itemWidth: 85,
                    itemHeight: 18,
                    itemTextColor: '#94a3b8',
                    symbolSize: 10,
                    symbolShape: 'circle',
                    itemsSpacing: 2,
                  }]}
                  tooltip={({ datum }) => (
                    <div className="glass-strong px-3 py-2 rounded-lg border border-white/20 shadow-glow">
                      <p className="text-sm">
                        <span className="text-neutral-400">{datum.id}:</span>{' '}
                        <span className="text-white font-medium">{datum.value}</span>
                      </p>
                    </div>
                  )}
                />
              </div>
            </Card>     

            {/* Newsletter Insights */}
            <Card variant="hover" className="group">
              <h2 className="text-xl font-semibold font-display text-white mb-6 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary-500/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-secondary-400" />
                </div>
                Latest Newsletter Insights
              </h2>
              <div className="space-y-3">
                {newsletters.slice(0, 3).map((newsletter, idx) => (
                  <div key={idx} className="p-4 glass rounded-xl hover:bg-white/10 
                    transition-all duration-300 border border-neutral-800 hover:border-primary-500/30 group/item">
                    <h3 className="font-medium text-base text-white mb-2 line-clamp-1 group-hover/item:text-primary-300 transition-colors">
                      {newsletter.title}
                    </h3>
                    <div className="flex justify-between items-center gap-2">
                      <Badge variant="primary" size="sm">
                        Quality: {getQualityScore(newsletters[idx])}%
                      </Badge>
                      <span className="text-sm text-neutral-400">
                        {new Date(newsletter.sentDate || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {newsletters.length === 0 && (
                  <div className="p-8 text-center glass rounded-xl border border-neutral-800">
                    <Mail className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-400">No newsletters sent yet</p>
                    <p className="text-sm text-neutral-500 mt-1">Create your first newsletter to see insights</p>
                  </div>
                )}
              </div>
            </Card>  
          </div>
        </div>
        </Container>
    );
  };
  // Main render
  return renderContent();
}