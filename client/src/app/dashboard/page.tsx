"use client";
import React, { useEffect, useState } from 'react';
import { Users, Mail, Star, BookOpen, Send } from 'lucide-react';
import { useData } from '@/context/dataContext';
import { newsletterAPI } from '@/services/api';
import { ResponsivePie } from '@nivo/pie';
import type { Newsletter } from '@/types';
import ExpiredSubscription from '@/components/subscription/ExpiredSubscription';
import { emailAPI } from '@/services/api';
import { useSubscription } from '@/context/subscriptionContext';

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
  const { subscribers } = useData();
  const { status, isRenewalRequired, loading: subscriptionLoading } = useSubscription();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailUsage, setEmailUsage] = useState<EmailUsage>({
    emailsSent: 0,
    dailyLimit: 100,
    remainingEmails: 100,
    percentUsed: 0
  });

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
        <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
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
      <div className="p-3 sm:p-4 md:p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-inter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Content Quality Dashboard
          </h1>
          
          {/* Email Sending Limits Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-lg sm:rounded-xl border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-500/10 flex items-center justify-center
                  transform transition-all duration-300 group-hover:scale-110">
                  <Send className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold mb-0.5 sm:mb-1">Email Sending Limits</h2>
                  <p className="text-gray-400 text-sm">
                    {emailUsage.remainingEmails} of {emailUsage.dailyLimit} emails remaining today
                  </p>
                </div>
              </div>
              
              <div className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/30 text-xs sm:text-sm">
                Resets at midnight
              </div>
            </div>
            
            <div className="w-full bg-gray-700/50 rounded-full h-2 sm:h-3">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  emailUsage.percentUsed > 80 ? 'bg-red-500' : 
                  emailUsage.percentUsed > 50 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`} 
                style={{ width: `${emailUsage.percentUsed}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{emailUsage.emailsSent} used</span>
              <span>{emailUsage.remainingEmails} remaining</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {metrics.map((metric, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-lg sm:rounded-xl
                  border border-gray-800 hover:border-blue-500/50
                  transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-500/10 
                    flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    <metric.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${metric.color}`} />
                  </div>
                  <span className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded-full ${
                    parseFloat(metric.change) >= 0 
                      ? 'text-green-400 bg-green-500/10 border border-green-500/30' 
                      : 'text-red-400 bg-red-500/10 border border-red-500/30'
                  }`}>
                    {metric.change}
                  </span>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm font-medium">{metric.label}</p>
                <p className="text-xl sm:text-2xl font-bold mt-1 font-inter tracking-tight">{metric.value}</p>
              </div>
            ))}
          </div>
            {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-lg sm:rounded-xl border border-gray-800 
              hover:border-blue-500/50 transition-all duration-300">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">Content Quality Distribution</h2>
              <div className="relative h-[280px] sm:h-[320px] md:h-[280px]">
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
                    <div className="bg-gray-800/90 px-3 py-2 rounded-lg border border-gray-700 shadow-xl">
                      <p className="text-sm">
                        <span className="text-gray-400">{datum.id}:</span>{' '}
                        <span className="text-white font-medium">{datum.value}</span>
                      </p>
                    </div>
                  )}
                />
              </div>
            </div>     

            {/* Newsletter Insights */}
            <div className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-lg sm:rounded-xl border border-gray-800 
              hover:border-blue-500/50 transition-all duration-300">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Latest Newsletter Insights</h2>
              <div className="space-y-3">
                {newsletters.slice(0, 3).map((newsletter, idx) => (
                  <div key={idx} className="p-3 sm:p-4 bg-gray-700/20 rounded-lg hover:bg-gray-700/30 
                    transition-colors duration-200 border border-gray-700/50">
                    <h3 className="font-medium text-sm sm:text-base mb-2 line-clamp-1">{newsletter.title}</h3>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2">
                      <span className="text-xs sm:text-sm text-gray-400">
                        Quality Score: {getQualityScore(newsletters[idx])}%
                      </span>
                      <span className="text-xs sm:text-sm text-gray-400">
                        {new Date(newsletter.sentDate || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
                {newsletters.length === 0 && (
                  <div className="p-4 text-center text-gray-400 text-sm">
                    No newsletters sent yet
                  </div>
                )}
              </div>
            </div>  
          </div>
        </div>
      </div>
    );
  };
  // Main render
  return renderContent();
}