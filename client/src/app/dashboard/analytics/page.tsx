  // src/app/dashboard/analytics/page.tsx
  "use client";
  import React from 'react';
  import { BarChart, Users, Mail } from 'lucide-react';
  import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
  import { analyticsAPI } from '@/services/api';

  interface AnalyticsSummary {
    subscribers: { total: number; change: number };
    newsletters: { total: number; change: number };
    openRate: { value: number; change: number };
  }
  
  interface GrowthData {
    date: string;
    subscribers: number;
  }
  
  interface RecentActivity {
    title: string;
    recipients: number;
    time: string;
  }
  const INITIAL_ACTIVITY:  RecentActivity [] = [
    { title: 'Newsletter #12 sent', recipients: 2000, time: '2 hours ago' },
    { title: 'Newsletter #11 sent', recipients: 1950, time: '1 day ago' },
    { title: 'Newsletter #10 sent', recipients: 1900, time: '2 days ago' },
  ];

  export default function AnalyticsDashboard() {
    const [loading, setLoading] = React.useState(true);
    const [summary, setSummary] = React.useState<AnalyticsSummary | null>(null);
    const [recentActivity] = React.useState<RecentActivity[]>(INITIAL_ACTIVITY);
    const [growthData, setGrowthData] = React.useState<GrowthData[]>([]);
    const [engagementData, setEngagementData] = React.useState(null);
    const [error, setError] = React.useState<string | null>(null);
  
    React.useEffect(() => {
      const fetchAnalytics = async () => {
        try {
          setLoading(true);
          const [summaryData, growth, engagement] = await Promise.all([
            analyticsAPI.getSummary(),
            analyticsAPI.getGrowthData('3months'),
            analyticsAPI.getEngagementMetrics()
          ]);
  
          if (summaryData) {
            setSummary(summaryData);
          } else {
            setError('Failed to load summary data');
          }
          setGrowthData(growth);
          setEngagementData(engagement);
        } catch (error) {
          setError('Failed to load analytics data');
          console.error('Analytics error:', error);
        } finally {
          setLoading(false);
        }
      };
  
      fetchAnalytics();
    }, []);
  
    if (loading) {
      return <div className="p-6">Loading analytics...</div>;
    }
  
    if (error) {
      return (
        <div className="p-6 text-red-500">
          {error}
        </div>
      );
    }
  
    if (!summary) {
      return <div className="p-6">No data available</div>;
    }
  
    const metrics = [
      {
        label: 'Total Subscribers',
        value: summary.subscribers.total.toLocaleString(),
        change: `${summary.subscribers.change > 0 ? '+' : ''}${summary.subscribers.change}%`,
        icon: Users,
        changeColor: summary.subscribers.change >= 0 ? 'text-green-500' : 'text-red-500'
      },
      {
        label: 'Newsletters Sent',
        value: summary.newsletters.total.toLocaleString(),
        change: `${summary.newsletters.change > 0 ? '+' : ''}${summary.newsletters.change}%`,
        icon: Mail,
        changeColor: summary.newsletters.change >= 0 ? 'text-green-500' : 'text-red-500'
      },
      {
        label: 'Average Open Rate',
        value: `${summary.openRate.value}%`,
        change: `${summary.openRate.change > 0 ? '+' : ''}${summary.openRate.change}%`,
        icon: BarChart,
        changeColor: summary.openRate.change >= 0 ? 'text-green-500' : 'text-red-500'
      }
    ];
  

    // Main render
    return (
      <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Analytics Overview</h1>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <metric.icon className="w-6 h-6 text-blue-500" />
              <span className={metric.changeColor}>{metric.change}</span>
            </div>
            <p className="text-gray-400 text-sm">{metric.label}</p>
            <p className="text-2xl font-bold mt-1">{metric.value}</p>
          </div>
        ))}
      </div>

        {/* Growth Chart */}
        <div className="p-5">
          <div className="bg-gray-800 p-6 rounded-xl mb-8">
          <h2 className="text-xl font-bold mb-6">Subscriber Growth</h2>
          <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={[
                    { month: 'Jan', subscribers: 1000 },
                    { month: 'Feb', subscribers: 1200 },
                    { month: 'Mar', subscribers: 1350 },
                    { month: 'Apr', subscribers: 1234 }
                  ]}
                >
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
        </div>

        {/* Recent Activity */}
        <div className="p-5">
          <div className="bg-gray-800 p-5 rounded-xl">
            <h2 className="text-xl font-bold mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-700">
                  <div>
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-gray-400">{activity.recipients} recipients</p>
                  </div>
                  <span className="text-sm text-gray-400">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };