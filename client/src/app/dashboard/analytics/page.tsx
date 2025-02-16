"use client";
import React from 'react';
import { BarChart, Users, Mail } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { analyticsAPI } from '@/services/api';
import type { ApiAnalyticsSummary, GrowthData } from '@/types';

interface ApiResponse {
  summary: ApiAnalyticsSummary;
  growthData: GrowthData[];
  recentActivity: Array<{
    title: string;
    recipients: number;
    time: string;
  }>;
}

export default function AnalyticsDashboard() {
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
        const response = await analyticsAPI.getSummary();
        if (response.status === 'success' && response.data) {
          const data = response.data.data || response.data;
          
          setSummary({
            subscribers: data.subscribers,
            newsletters: data.newsletters,
            openRate: data.openRate
          });
          
          setGrowthData(data.growthData || []);
          setRecentActivity(data.recentActivity || []);
        }
      } catch (error) {
        console.error('Analytics fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, []);
  

  if (loading || !summary) {
    console.log('Loading state triggered');
    return <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>;
  }

  const metrics = [
    {
      label: 'Total Subscribers',
      value: summary?.subscribers?.total?.toLocaleString() || '0',
      change: summary?.subscribers?.change || 0,
      icon: Users
    },
    {
      label: 'Newsletters Sent',
      value: summary?.newsletters?.total?.toLocaleString() || '0',
      change: summary?.newsletters?.change || 0,
      icon: Mail
    },
    {
      label: 'Average Open Rate',
      value: `${summary?.openRate?.value?.toFixed(1) || '0'}%`,
      change: summary?.openRate?.change || 0,
      icon: BarChart
    }
  ];
  console.log('Metrics data:', metrics);
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <metric.icon className="w-6 h-6 text-blue-500" />
              <span className={`text-sm ${
                metric.change >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
              </span>
            </div>
            <p className="text-gray-400 text-sm">{metric.label}</p>
            <p className="text-2xl font-bold mt-1">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 p-6 rounded-xl mb-8">
        <h2 className="text-xl font-bold mb-6">Subscriber Growth</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                itemStyle={{ color: '#D1D5DB' }}
              />
              <Line
                type="monotone"
                dataKey="subscribers"
                stroke="#3B82F6"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl">
        <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
        <div className="space-y-4">
          {recentActivity.map((activity, idx) => (
            <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-700">
              <div>
                <p className="font-medium">{activity.title}</p>
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
  );
}