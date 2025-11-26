// For local development, use: http://localhost:3000
// Deployment link: https://client-3ye4.onrender.com

"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Users, Mail, TrendingUp, TrendingDown, BarChart3, Activity, ArrowUpRight, Sparkles } from 'lucide-react';
import { ResponsiveLine } from '@nivo/line';

import { analyticsAPI } from '../../../services/api';
import { useData } from '../../../context/dataContext';
import type { ApiAnalyticsSummary, GrowthData as AppGrowthData } from '../../../types';
import Container from '@/components/UI/Container';
import GlassCard from '@/components/UI/GlassCard';
import Badge from '@/components/UI/Badge';
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

export default function AnalyticsDashboard() {
  const { subscribers } = useData();
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState<ApiAnalyticsSummary | null>(null);
  const [growthData, setGrowthData] = React.useState<AppGrowthData[]>([]);
  const [recentActivity, setRecentActivity] = React.useState<Array<{
    title: string;
    recipients: number;
    time: string;
  }>>([]);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch summary data
        const response = await analyticsAPI.getSummary();
        const data = (response.data && typeof response.data === 'object' && 'data' in response.data)
          ? (response.data as { data: ApiAnalyticsSummary }).data
          : (response.data as ApiAnalyticsSummary);
        
        if (response.status === 'success' && data) {
          setSummary({
            subscribers: data.subscribers,
            newsletters: data.newsletters,
          });
          
          // Fetch recent activity
          setRecentActivity(data.recentActivity || []);
        }
        
        // Simplified growth data fetching with proper error handling
        try {
          // Fetch growth data for 6 months
          const growthResponse = await analyticsAPI.getGrowthData('6month');
          
          // Handle the API response structure properly
          if (growthResponse && typeof growthResponse === 'object' && 'status' in growthResponse) {
            // API returned the standard wrapper format
            const apiResponse = growthResponse as unknown as { status: string; data: AppGrowthData[] };
            
            if (apiResponse.status === 'success' && Array.isArray(apiResponse.data)) {
              const formattedData: AppGrowthData[] = apiResponse.data.map((item: AppGrowthData) => {
                const monthValue = item.month || 
                                (item.date ? new Date(item.date).toLocaleString('default', { month: 'short' }) : '');
                return {
                  month: monthValue,
                  subscribers: Number(item.subscribers || 0)
                };
              });
              
              setGrowthData(formattedData);
              return;
            }
          }
          
          // Handle case where API directly returns an array
          if (Array.isArray(growthResponse) && growthResponse.length > 0) {
            const formattedData: AppGrowthData[] = (growthResponse as AppGrowthData[]).map((item) => {
              const monthValue = item.month || 
                               (item.date ? new Date(item.date).toLocaleString('default', { month: 'short' }) : '');
              return {
                month: monthValue,
                subscribers: Number(item.subscribers || 0)
              };
            });
            setGrowthData(formattedData);
          } else {
            throw new Error('No growth data returned from API');
          }
        } catch (error) {
          console.error('Growth data fetch error:', error instanceof Error ? error.message : 'Unknown error');
          
          // Set fallback data
          const mockData: AppGrowthData[] = [
            { month: 'Jan', subscribers: 100 },
            { month: 'Feb', subscribers: 120 },
            { month: 'Mar', subscribers: 150 },
            { month: 'Apr', subscribers: 180 },
            { month: 'May', subscribers: 210 }
          ];
          setGrowthData(mockData);
        }
      } catch (error) {
        console.error('Analytics fetch error:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [subscribers]);

  if (loading || !summary) {
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

  const activeSubscribers = subscribers.filter(s => s.status === 'active').length;
  const subscriberChange = summary.subscribers?.change || 0;
  const newsletterChange = summary.newsletters?.change || 0;

  const metrics = [
    {
      id: 'subscribers',
      label: 'Active Subscribers',
      value: activeSubscribers,
      change: subscriberChange,
      icon: Users,
      gradient: 'from-primary-500 to-primary-600',
      bgGradient: 'from-primary-500/20 to-primary-600/20'
    },
    {
      id: 'newsletters',
      label: 'Newsletters Sent',
      value: summary.newsletters?.total || 0,
      change: newsletterChange,
      icon: Mail,
      gradient: 'from-secondary-500 to-secondary-600',
      bgGradient: 'from-secondary-500/20 to-secondary-600/20'
    },
    {
      id: 'growth',
      label: 'Avg. Growth Rate',
      value: Math.abs(subscriberChange),
      suffix: '%',
      change: subscriberChange,
      icon: BarChart3,
      gradient: 'from-success-500 to-success-600',
      bgGradient: 'from-success-500/20 to-success-600/20'
    },
    {
      id: 'engagement',
      label: 'Engagement Score',
      value: Math.min(100, Math.round((summary.newsletters?.total || 0) * 10 / Math.max(activeSubscribers, 1) * 100)),
      suffix: '%',
      change: 5.2,
      icon: Activity,
      gradient: 'from-warning-500 to-warning-600',
      bgGradient: 'from-warning-500/20 to-warning-600/20'
    }
  ];

  // Get average value for reference line
  const averageSubscribers = growthData.length 
    ? Math.round(growthData.reduce((sum, item) => sum + (item.subscribers ?? 0), 0) / growthData.length)
    : 0;


  return (
    <Container size="xl" className="py-8 min-h-screen">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl sm:text-4xl font-bold font-display gradient-text mb-2">
            Analytics
          </h1>
          <p className="text-neutral-400">Track your newsletter performance and subscriber growth</p>
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
                    AI-Powered Smart Scheduling
                    <Badge variant="success" size="sm">New</Badge>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Let AI analyze your audience and recommend the optimal time to send newsletters for maximum engagement
                  </p>
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
                    <Badge
                      variant={metric.change >= 0 ? 'success' : 'error'}
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      {metric.change >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-neutral-400 text-xs sm:text-sm mb-1">{metric.label}</p>
                  <p className="text-2xl sm:text-3xl font-bold font-display text-white">
                    <AnimatedCounter value={metric.value} />
                    {metric.suffix && <span className="text-xl">{metric.suffix}</span>}
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Growth Chart */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="strong" padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-bold font-display text-white">Subscriber Growth</h2>
                <p className="text-xs sm:text-sm text-neutral-400">Last 6 months performance</p>
              </div>
              <Badge variant="default" size="sm" className="flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                {growthData.length > 1 
                  ? `+${(growthData[growthData.length - 1]?.subscribers ?? 0) - (growthData[0]?.subscribers ?? 0)}` 
                  : '0'} total
              </Badge>
            </div>
            
            <div className="h-56 sm:h-64 md:h-72">
              <ResponsiveLine
                data={[{
                  id: 'subscribers',
                  data: growthData.map(d => ({
                    x: d.month ?? '',
                    y: d.subscribers ?? 0
                  }))
                }]}
                margin={{ top: 10, right: 40, left: 50, bottom: 40 }}
                curve="monotoneX"
                enableArea={true}
                areaBaselineValue={0}
                areaOpacity={0.15}
                enablePoints={true}
                pointSize={10}
                pointColor="#1a1a2e"
                pointBorderWidth={3}
                pointBorderColor="#a855f7"
                colors={["#a855f7"]}
                lineWidth={3}
                theme={{
                  grid: {
                    line: {
                      stroke: "#334155",
                      strokeWidth: 1,
                      strokeDasharray: "4 4",
                      opacity: 0.2
                    }
                  },
                  axis: {
                    ticks: {
                      text: {
                        fill: "#94a3b8",
                        fontSize: 12,
                        fontFamily: 'Inter, sans-serif'
                      }
                    }
                  },
                  tooltip: {
                    container: {
                      background: "transparent",
                      color: "#F3F4F6",
                      fontSize: 12,
                      borderRadius: 12,
                      boxShadow: "none",
                      padding: 0
                    }
                  }
                }}
                axisLeft={{
                  tickSize: 0,
                  tickPadding: 12,
                  tickRotation: 0
                }}
                axisBottom={{
                  tickSize: 0,
                  tickPadding: 12,
                  tickRotation: 0
                }}
                gridYValues={5}
                enableGridX={false}
                markers={[
                  {
                    axis: 'y',
                    value: averageSubscribers,
                    lineStyle: { stroke: '#6366f1', strokeDasharray: '6 4', strokeWidth: 2 },
                    legend: `Avg: ${averageSubscribers}`,
                    legendPosition: 'right',
                    legendOrientation: 'vertical',
                    textStyle: { fill: '#6366f1', fontSize: 11, fontWeight: 600 }
                  }
                ]}
                useMesh={true}
                enableSlices="x"
                sliceTooltip={({ slice }) => (
                  <div className="backdrop-blur-xl bg-neutral-900/90 p-4 rounded-xl border border-white/20 shadow-2xl">
                    <p className="text-white font-semibold mb-2">
                      {slice.points[0].data.x as string}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500"></div>
                      <p className="text-neutral-200">
                        <span className="font-bold text-primary-400">
                          {slice.points[0].data.y ? (slice.points[0].data.y as number).toLocaleString() : 0}
                        </span> subscribers
                      </p>
                    </div>
                    {(slice.points[0].data.y as number) > averageSubscribers && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <Badge variant="success" size="sm">Above average</Badge>
                      </div>
                    )}
                  </div>
                )}
              />
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="strong" padding="none" className="overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold font-display text-white">Recent Activity</h2>
                <p className="text-xs sm:text-sm text-neutral-400">Your latest newsletter campaigns</p>
              </div>
              <Badge variant="default" size="sm">{recentActivity.length} campaigns</Badge>
            </div>
            
            {recentActivity.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 
                  flex items-center justify-center border border-white/10">
                  <Activity className="w-8 h-8 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No activity yet</h3>
                <p className="text-neutral-400">Send your first newsletter to see activity here</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentActivity.map((activity, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-4 sm:p-6 hover:bg-gradient-to-r hover:from-primary-500/5 hover:to-transparent 
                      transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 
                          flex items-center justify-center border border-white/10 flex-shrink-0
                          group-hover:scale-105 transition-transform duration-300">
                          <Mail className="w-5 h-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-white group-hover:text-primary-300 transition-colors">
                            {activity.title}
                          </p>
                          <p className="text-sm text-neutral-400 flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            {activity.recipients.toLocaleString()} recipients
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-neutral-500">
                        {new Date(activity.time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
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
}