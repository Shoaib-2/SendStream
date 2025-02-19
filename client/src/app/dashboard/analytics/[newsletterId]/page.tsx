// src/app/dashboard/analytics/[newsletterId]/page.tsx
"use client";
import React from 'react';
import { useParams } from 'next/navigation';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B'];

const initialMetrics = {
  opens: { count: 450, rate: 68 },
  clicks: { count: 156, rate: 23 },
  bounces: { count: 12, rate: 1.8 },
  unsubscribes: { count: 8, rate: 1.2 }
};

export default function NewsletterAnalytics() {
  const params = useParams();
  const [loading, setLoading] = React.useState(true);
  const [metrics] = React.useState(initialMetrics);
  const newsletter = { title: 'Sample Newsletter', sentDate: '2023-10-01' }; // Define the newsletter object

  React.useEffect(() => {
    // Fetch data only once when component mounts
    const fetchData = async () => {
      try {
        // API call will go here
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Empty dependency array to run only once

  const pieData = React.useMemo(() => [
    { name: 'Opened', value: metrics.opens.rate },
    { name: 'Clicked', value: metrics.clicks.rate },
    { name: 'Bounced', value: metrics.bounces.rate },
    { name: 'Unsubscribed', value: metrics.unsubscribes.rate }
  ], [metrics]);

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }
  console.log('Loading:', loading);


  // 4. Prepare render content regardless of loading state
  const renderContent = () => (
    <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-inter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            {newsletter.title} Analytics
          </h1>
          <div className="text-gray-400 font-inter">
            Sent: {new Date(newsletter.sentDate).toLocaleDateString()}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl
            border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
            <h2 className="text-xl font-bold font-inter mb-6">Overview</h2>
            <div className="space-y-4">
              {Object.entries(metrics).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center p-3
                  hover:bg-blue-500/5 rounded-lg transition-colors">
                  <span className="capitalize font-inter">{key}</span>
                  <div className="text-right">
                    <div className="font-bold font-inter">{value.count}</div>
                    <div className="text-sm text-gray-400">{value.rate}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl
            border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
            <h2 className="text-xl font-bold font-inter mb-6">Engagement Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index]}
                        className="transition-all duration-300 hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#1F2937',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      borderRadius: '0.5rem',
                      fontFamily: 'Inter'
                    }}
                    itemStyle={{ color: '#D1D5DB' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return loading ? (
    <div className="flex justify-center items-center h-[80vh]">
      <div className="w-16 h-16 relative">
        <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
      </div>
    </div>
  ) : renderContent();
}