"use client";
import React, { useEffect, useState } from 'react';
import { Users, Mail, BarChart } from 'lucide-react';
import { useData } from '@/context/dataContext';
import { newsletterAPI } from '@/services/api';
import type { Newsletter } from '@/types';

export default function DashboardPage() {
  const { subscribers } = useData();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);


  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        const data = await newsletterAPI.getAll();
        console.log('Fetched newsletters:', data);
        if (data) {
          setNewsletters(data);
          console.log('Sent newsletters:', data.filter(n => n.status === 'sent'));
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
  
    fetchNewsletters();
  }, []);

  // console.log('Raw newsletters:', newsletters);
  // console.log('Sent newsletters:', sentNewsletters);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const sentNewsletters = newsletters.filter(n => n.status === 'sent');
  const recentNewsletters = sentNewsletters.filter(n =>
    n.sentDate && new Date(n.sentDate) > thirtyDaysAgo
  );
  const recentSubscribers = subscribers.filter(s =>
    new Date(s.subscribed) > thirtyDaysAgo
  );

  const averageOpenRate = sentNewsletters.length > 0
    ? sentNewsletters.reduce((acc, n) => acc + (n.openRate || 0), 0) / sentNewsletters.length
    : 0;

  const metrics = [
    {
      label: 'Total Subscribers',
      value: subscribers.length,
      change: subscribers.length > 0
        ? `${((recentSubscribers.length / subscribers.length) * 100).toFixed(1)}%`
        : '0%',
      icon: Users
    },
    {
      label: 'Newsletters Sent',
      value: sentNewsletters.length,
      change: sentNewsletters.length > 0
        ? `${((recentNewsletters.length / sentNewsletters.length) * 100).toFixed(1)}%`
        : '0%',
      icon: Mail
    },
    {
      label: 'Open Rate',
      value: `${averageOpenRate.toFixed(1)}%`,
      change: `${averageOpenRate.toFixed(1)}%`,
      icon: BarChart
    }
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <metric.icon className="w-6 h-6 text-blue-500" />
              <span className={`text-sm ${parseFloat(metric.change) >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                {metric.change}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{metric.label}</p>
            <p className="text-2xl font-bold mt-1">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
