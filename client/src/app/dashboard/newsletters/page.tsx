// src/app/dashboard/newsletters/page.tsx
"use client";
import React from 'react';
import { BarChart, Users, Mail, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Newsletter {
  id: string;
  title: string;
  status: 'draft' | 'scheduled' | 'sent';
  openRate: number;
  clickRate: number;
  sentDate?: string;
  scheduledDate?: string;
}

const NewsletterDashboard = () => {
  const router = useRouter();
  const metrics = [
    { label: 'Total Subscribers', value: '1,234', icon: Users },
    { label: 'Avg. Open Rate', value: '45%', icon: Mail },
    { label: 'Sent This Month', value: '8', icon: Send }
  ];

  const handleCreateClick = () => {
    router.push('/dashboard/newsletters/create');
  };

  // Mock data
  const recentNewsletters: Newsletter[] = [
    {
      id: '1',
      title: 'Weekly Update #12',
      status: 'sent',
      openRate: 68,
      clickRate: 23,
      sentDate: '2024-01-28'
    },
    {
      id: '2',
      title: 'Product Launch',
      status: 'scheduled',
      openRate: 0,
      clickRate: 0,
      scheduledDate: '2024-02-01'
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Newsletter Dashboard</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        onClick={handleCreateClick}
        >
          Create Newsletter
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <metric.icon className="w-5 h-5 text-blue-500" />
              <span className="text-gray-400">{metric.label}</span>
            </div>
            <p className="text-2xl font-bold">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Newsletter List */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="font-semibold">Recent Newsletters</h2>
        </div>
        <div className="divide-y divide-gray-700">
          {recentNewsletters.map((newsletter) => (
            <div key={newsletter.id} className="p-6 hover:bg-gray-750 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{newsletter.title}</h3>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  newsletter.status === 'sent' ? 'bg-green-500/10 text-green-500' :
                  newsletter.status === 'scheduled' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-gray-500/10 text-gray-500'
                }`}>
                  {newsletter.status.charAt(0).toUpperCase() + newsletter.status.slice(1)}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-gray-400">
                <span>Open Rate: {newsletter.openRate}%</span>
                <span>Click Rate: {newsletter.clickRate}%</span>
                {newsletter.sentDate && <span>Sent: {newsletter.sentDate}</span>}
                {newsletter.scheduledDate && <span>Scheduled: {newsletter.scheduledDate}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsletterDashboard;