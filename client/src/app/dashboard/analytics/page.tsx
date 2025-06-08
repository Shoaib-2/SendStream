"use client";
import React from 'react';
import { Users, Mail } from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Area, 
  AreaChart,
  ReferenceLine
} from 'recharts';

import { analyticsAPI } from '../../../services/api';
import { useData } from '../../../context/dataContext';
import type { ApiAnalyticsSummary, GrowthData } from '../../../types';

export default function AnalyticsDashboard() {
  const { subscribers } = useData();
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState<ApiAnalyticsSummary | null>(null);
  const [growthData, setGrowthData] = React.useState<GrowthData[]>([]);
  const [recentActivity, setRecentActivity] = React.useState<Array<{
    title: string;
    recipients: number;
    time: string;
  }>>([]);
  const [hoveredPoint, setHoveredPoint] = React.useState<number | null>(null);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch summary data
        const response = await analyticsAPI.getSummary();
        if (response.status === 'success' && response.data) {
          const data = response.data.data || response.data;
          
          setSummary({
            subscribers: data.subscribers,
            newsletters: data.newsletters,
          });
          
          // Fetch recent activity
          setRecentActivity(data.recentActivity || []);
        }
        
        // Simplified growth data fetching with proper error handling
        try {
          // console.log('Fetching growth data...');
          // Fetch growth data for 6 months
          const growthResponse = await analyticsAPI.getGrowthData('6month');
          
          // Handle the API response structure properly
          if (growthResponse && typeof growthResponse === 'object' && 'status' in growthResponse) {
            // API returned the standard wrapper format
            const apiResponse = growthResponse as unknown as { status: string; data: GrowthData[] };
            
            if (apiResponse.status === 'success' && Array.isArray(apiResponse.data)) {
              const formattedData: GrowthData[] = apiResponse.data.map((item: any) => {
                // Handle date to month conversion - use existing month if available
                const monthValue = item.month || 
                                (item.date ? new Date(item.date).toLocaleString('default', { month: 'short' }) : '');
                
                return {
                  month: monthValue,
                  subscribers: Number(item.subscribers || 0)
                };
              });
              
              // console.log('Formatted growth data:', formattedData);
              setGrowthData(formattedData);
              return; // Exit early after setting growth data
            }
          }
          
          // Handle case where API directly returns an array
          if (Array.isArray(growthResponse) && growthResponse.length > 0) {
            const formattedData: GrowthData[] = growthResponse.map((item: any) => {
              const monthValue = item.month || 
                               (item.date ? new Date(item.date).toLocaleString('default', { month: 'short' }) : '');
              
              return {
                month: monthValue,
                subscribers: Number(item.subscribers || 0)
              };
            });
            setGrowthData(formattedData);
          } else {
            // Only use mock data if no data was returned at all
            throw new Error('No growth data returned from API');
          }
        } catch (error) {
          console.error('Growth data fetch error:', error instanceof Error ? error.message : 'Unknown error');
          
          // Set fallback data
          const mockData: GrowthData[] = [
            { month: 'Jan', subscribers: 100 },
            { month: 'Feb', subscribers: 120 },
            { month: 'Mar', subscribers: 150 },
            { month: 'Apr', subscribers: 180 },
            { month: 'May', subscribers: 210 }
          ];
          setGrowthData(mockData);
          console.log('Using fallback growth data');
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
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Subscribers',
      value: subscribers.filter(s => s.status === 'active').length.toLocaleString(),
      change: summary.subscribers?.change || 0,
      icon: Users
    },
    {
      label: 'Newsletters Sent',
      value: summary.newsletters?.total?.toLocaleString() || '0',
      change: summary.newsletters?.change || 0,
      icon: Mail
    }
  ];

  // Get average and maximum values for reference line
  const averageSubscribers = growthData.length 
    ? Math.round(growthData.reduce((sum, item) => sum + item.subscribers, 0) / growthData.length)
    : 0;

  // Custom tooltip component for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800 p-4 rounded-lg border border-blue-500/30 shadow-lg shadow-blue-500/10">
          <p className="text-gray-300 font-medium mb-1">{label}</p>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <p className="text-blue-400 font-bold">
              {payload[0].value.toLocaleString()} subscribers
            </p>
          </div>
          {payload[0].payload.subscribers > averageSubscribers && (
            <p className="text-green-400 text-xs mt-2">Above average</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom dot for the line chart
  const CustomDot = (props: any) => {
    const { cx, cy, index } = props;
    const isHovered = index === hoveredPoint;
    
    return (
      <circle
        cx={cx}
        cy={cy}
        r={isHovered ? 6 : 4}
        fill={isHovered ? "#fff" : "#3B82F6"}
        stroke={isHovered ? "#3B82F6" : "rgba(255,255,255,0.5)"}
        strokeWidth={isHovered ? 2 : 1}
        className="transition-all duration-300"
      />
    );
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold font-inter mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Analytics Overview
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {metrics.map((metric, idx) => (
            <div 
              key={idx}
              className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl
                border border-gray-800 hover:border-blue-500/50
                transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center
                  group-hover:scale-110 transition-all duration-300">
                  <metric.icon className="w-6 h-6 text-blue-500" />
                </div>
                <span className={`text-sm px-3 py-1 rounded-full ${
                  metric.change >= 0 
                    ? 'text-green-400 bg-green-500/10' 
                    : 'text-red-400 bg-red-500/10'
                }`}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </span>
              </div>
              <p className="text-gray-400 text-sm font-inter">{metric.label}</p>
              <p className="text-2xl font-bold mt-1 font-inter">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 
          hover:border-blue-500/50 transition-all duration-300 mb-8">
          <h2 className="text-xl font-bold font-inter mb-6">Subscriber Growth</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={growthData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                onMouseMove={(e) => {
                  if (e && e.activeTooltipIndex !== undefined) {
                    setHoveredPoint(e.activeTooltipIndex);
                  }
                }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="colorSubscribers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#374151" 
                  opacity={0.3} 
                  vertical={false}
                />
                <XAxis 
                  dataKey="month" 
                  stroke="#9CA3AF" 
                  tick={{ fill: '#9CA3AF' }}
                  axisLine={{ stroke: '#374151', strokeOpacity: 0.5 }}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  domain={[0, 'auto']}
                  axisLine={{ stroke: '#374151', strokeOpacity: 0.5 }}
                  tickLine={false}
                  width={40}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#6B7280', strokeDasharray: '5 5' }}
                />
                <ReferenceLine 
                  y={averageSubscribers} 
                  stroke="#9CA3AF" 
                  strokeDasharray="3 3"
                  label={{ 
                    value: 'Average', 
                    position: 'right', 
                    fill: '#9CA3AF',
                    fontSize: 12
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="subscribers"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fill="url(#colorSubscribers)"
                  dot={<CustomDot />}
                  activeDot={{ 
                    r: 8, 
                    fill: "#fff",
                    stroke: "#3B82F6",
                    strokeWidth: 2
                  }}
                  animationDuration={1800}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 
          hover:border-blue-500/50 transition-all duration-300">
          <h2 className="text-xl font-bold font-inter mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <div key={idx} 
                className="flex justify-between items-center py-3 border-b border-gray-700/50 
                  hover:border-blue-500/20 transition-colors">
                <div>
                  <p className="font-medium font-inter">{activity.title}</p>
                  <p className="text-sm text-gray-400">{activity.recipients} recipients</p>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(activity.time).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}