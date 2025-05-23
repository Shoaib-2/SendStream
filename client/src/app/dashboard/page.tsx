"use client";
import React, { useEffect, useState } from 'react';
import { Users, Mail, Star, BookOpen, Send } from 'lucide-react';
import { useData } from '@/context/dataContext';
import { newsletterAPI } from '@/services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Newsletter } from '@/types';
import ExpiredSubscription from '@/components/subscription/ExpiredSubscription';
import { useRouter } from 'next/navigation';
import { emailAPI } from '@/services/api';

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
  const router = useRouter();
  const { subscribers } = useData();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [shouldRedirectToLogin, setShouldRedirectToLogin] = useState(false);
  const [emailUsage, setEmailUsage] = useState<EmailUsage>({
    emailsSent: 0,
    dailyLimit: 100,
    remainingEmails: 100,
    percentUsed: 0
  });

  // Handle authentication redirect - always declare hooks at the top level
  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.push('/login');
    }
  }, [shouldRedirectToLogin, router]);

  // Fetch email usage stats
  useEffect(() => {
    const fetchEmailUsage = async () => {
      try {
        if (!isAuthenticated) return;
        
        const data = await emailAPI.getUsage();
        
        if (data) {
          const { emailsSent, dailyLimit } = data;
          const remainingEmails = Math.max(0, dailyLimit - emailsSent);
          const percentUsed = (emailsSent / dailyLimit) * 100;
          
          setEmailUsage({
            emailsSent,
            dailyLimit,
            remainingEmails,
            percentUsed
          });
        }
      } catch (error) {
        console.error('Error fetching email usage stats:', error);
        // Default values if API fails
        setEmailUsage({
          emailsSent: 0,
          dailyLimit: 100,
          remainingEmails: 100,
          percentUsed: 0
        });
      }
    };
    
    fetchEmailUsage();
    
    // Set interval to refresh stats every minute
    const intervalId = setInterval(fetchEmailUsage, 60000);
    
    return () => clearInterval(intervalId);
  }, [isAuthenticated]);

  // Check authentication and subscription status
  useEffect(() => {
    const checkAuthAndSubscription = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
      
      if (token) {
        const hasAccess = localStorage.getItem('has_active_access') === 'true';
        // console.log('Dashboard - subscription check:', hasAccess);
        setSubscriptionExpired(!hasAccess);
      } else {
        setShouldRedirectToLogin(true);
        setSubscriptionExpired(false);
      }
    };
    
    // Check on initial render
    checkAuthAndSubscription();
    
    // Listen for our custom event
    const handleSubscriptionChange = () => {
      // console.log('Dashboard detected subscription change');
      checkAuthAndSubscription();
    };
    
    // Listen for both storage and custom events
    window.addEventListener('storage', handleSubscriptionChange);
    window.addEventListener('subscription-changed', handleSubscriptionChange);
    
    return () => {
      window.removeEventListener('storage', handleSubscriptionChange);
      window.removeEventListener('subscription-changed', handleSubscriptionChange);
    };
  }, []);

  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        // Only fetch if authenticated and subscription not expired
        if (!isAuthenticated) {
          // console.log('Not authenticated, skipping newsletter fetch');
          setLoading(false);
          return;
        }
        
        if (subscriptionExpired) {
          // console.log('Subscription expired, skipping newsletter fetch');
          setLoading(false);
          return;
        }
        
        setLoading(true);
        // console.log('Fetching newsletters');
        const data = await newsletterAPI.getAll();
        
        if (data) {
          const transformedData = data.map(newsletter => ({
            ...newsletter
          }));
          setNewsletters(transformedData);
          setQualityMetrics(data.map(newsletter => ({
            originalContent: newsletter.contentQuality?.isOriginalContent || false,
            researchBased: newsletter.contentQuality?.hasResearchBacked || false,
            actionableInsights: newsletter.contentQuality?.hasActionableInsights || false,
            comprehensiveAnalysis: newsletter.contentQuality?.contentLength ? newsletter.contentQuality.contentLength > 500 : false
          })));
        }
      } catch (error: any) {
        console.error('Error fetching newsletters:', error);
        
        if (
          error?.message?.includes('Subscription expired') ||
          error?.message?.includes('Subscription required') ||
          error?.response?.status === 403
        ) {
          localStorage.removeItem('has_active_access');
          setSubscriptionExpired(true);
        }
      } finally {
        setLoading(false);
      }
    };
  
    // Fetch data when dependencies change
    fetchNewsletters();
  }, [isAuthenticated, subscriptionExpired]);

  // Content rendering logic
  const renderContent = () => {
    // Handle loading state
    if (loading) {
      return (
        <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    // Handle expired subscription
    if (subscriptionExpired) {
      return <ExpiredSubscription />;
    }
    
    // Handle not authenticated (showing loading while redirect happens)
    if (!isAuthenticated || shouldRedirectToLogin) {
      return (
        <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
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
      <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold font-inter mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Content Quality Dashboard
          </h1>
          
          {/* Email Sending Limits Card */}
          <div className="mb-8 bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4">
              <div className="flex items-center mb-4 md:mb-0">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mr-4">
                  <Send className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-1">Email Sending Limits</h2>
                  <p className="text-gray-400 text-sm">
                    {emailUsage.remainingEmails} of {emailUsage.dailyLimit} emails remaining today
                  </p>
                </div>
              </div>
              
              <div className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/30 text-sm">
                Resets at midnight
              </div>
            </div>
            
            <div className="w-full bg-gray-700/50 rounded-full h-3">
              <div 
                className={`h-3 rounded-full ${
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {metrics.map((metric, index) => (
              <div 
                key={index}
                className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl
                  border border-gray-800 hover:border-blue-500/50
                  transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center
                    group-hover:scale-110 transition-all duration-300">
                    <metric.icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                  <span className={`text-sm px-3 py-1 rounded-full ${
                    parseFloat(metric.change) >= 0 
                      ? 'text-green-400 bg-green-500/10' 
                      : 'text-red-400 bg-red-500/10'
                  }`}>
                    {metric.change}
                  </span>
                </div>
                <p className="text-gray-400 text-sm font-inter">{metric.label}</p>
                <p className="text-2xl font-bold mt-1 font-inter">{metric.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl">
              <h2 className="text-xl font-semibold mb-6">Content Quality Distribution</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={newsletterData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {newsletterData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      layout="vertical" 
                      align="right" 
                      verticalAlign="middle"
                      formatter={(value) => <span className="text-gray-400">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl">
              <h2 className="text-xl font-semibold mb-4">Latest Newsletter Insights</h2>
              <div className="space-y-4">
                {newsletters.slice(0, 3).map((newsletter, idx) => (
                  <div key={idx} className="p-4 bg-gray-700/20 rounded-lg">
                    <h3 className="font-medium mb-2">{newsletter.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      {qualityMetrics[idx]?.originalContent && (
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                          Original Content
                        </span>
                      )}
                      {qualityMetrics[idx]?.researchBased && (
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                          Research-Based
                        </span>
                      )}
                      {qualityMetrics[idx]?.actionableInsights && (
                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">
                          Actionable Insights
                        </span>
                      )}
                      {qualityMetrics[idx]?.comprehensiveAnalysis && (
                        <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                          Comprehensive
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex justify-between items-center">
                      <span className="text-sm text-gray-400">
                      Quality Score: {getQualityScore(newsletters[idx])}%
                      </span>
                      <span className="text-sm text-gray-400">
                        {new Date(newsletter.sentDate || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>  
          </div>
        </div>
      </div>
    );
  };

  // CustomTooltip component for the chart
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/90 p-3 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-400">
            {payload[0].name}: <span className="text-white font-medium">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Main render
  return renderContent();
}