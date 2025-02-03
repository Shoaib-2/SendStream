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

  // 4. Prepare render content regardless of loading state
  const renderContent = () => (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{newsletter.title} Analytics</h1>
        <div className="text-gray-400">
          Sent: {new Date(newsletter.sentDate).toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Metrics Summary */}
        <div className="bg-gray-800 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-6">Overview</h2>
          <div className="space-y-4">
            {Object.entries(metrics).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className="capitalize">{key}</span>
                <div className="text-right">
                  <div className="font-bold">{value.count}</div>
                  <div className="text-sm text-gray-400">{value.rate}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Engagement Distribution */}
        <div className="bg-gray-800 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-6">Engagement Distribution</h2>
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
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                  itemStyle={{ color: '#D1D5DB' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  // 5. Return loading state or content
  return loading ? <div className="p-6">Loading...</div> : renderContent();
}