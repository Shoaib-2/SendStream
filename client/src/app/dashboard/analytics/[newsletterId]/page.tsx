"use client";
import React from 'react';
import { Users, Mail } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { analyticsAPI } from '../../../../services/api';
import { useData } from '../../../../context/dataContext';
import type { ApiAnalyticsSummary, GrowthData } from '../../../../types';

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
        
        // First try to fetch real data from the API
        try {
          // Directly use the controller's implementation
          const monthlyData: { [key: string]: number } = {};
          
          // Process current subscribers to generate growth data
          subscribers.forEach(sub => {
            if (!sub.subscribed) return;
            
            // Format date to match controller logic
            const subscribeDate = new Date(sub.subscribed);
            const month = subscribeDate.toLocaleString('default', { month: 'short' });
            monthlyData[month] = (monthlyData[month] || 0) + 1;
          });
          
          // Convert to array format matching the API response
          const generatedGrowthData: GrowthData[] = Object.entries(monthlyData)
            .map(([month, subscribers]) => ({
              month,
              subscribers
            }))
            .sort((a, b) => {
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return months.indexOf(a.month) - months.indexOf(b.month);
            });
          
          if (generatedGrowthData.length > 0) {
            setGrowthData(generatedGrowthData);
            console.log('Using client-side generated growth data:', generatedGrowthData);
          } else {
            // Fallback to mock data if no subscribers with dates
            throw new Error('No subscriber data with dates available');
          }
        } catch (error) {
          console.error('Growth data generation error:', error instanceof Error ? error.message : 'Unknown error');
          
          // Fallback to mock data if generation fails
          const mockData: GrowthData[] = [
            { month: 'Jan', subscribers: 100 },
            { month: 'Feb', subscribers: 120 },
            { month: 'Mar', subscribers: 150 },
            { month: 'Apr', subscribers: 180 },
            { month: 'May', subscribers: 210 },
            { month: 'Jun', subscribers: 245 }
          ];
          
          setGrowthData(mockData);
          console.log('Using fallback mock data');
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

  // Debug to check if data is present
  console.log('Growth data:', growthData);

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
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis 
                  stroke="#9CA3AF" 
                  domain={[0, 'auto']} // Ensures the chart starts at 0
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    borderRadius: '0.5rem'
                  }}
                  itemStyle={{ color: '#D1D5DB' }}
                />
                <Line
                  type="monotone"
                  dataKey="subscribers"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: "#3B82F6", r: 4 }} 
                  activeDot={{ fill: "#3B82F6", r: 6, strokeWidth: 1, stroke: "#fff" }}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
              </LineChart>
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