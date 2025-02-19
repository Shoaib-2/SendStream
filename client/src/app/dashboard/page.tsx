"use client";
import React, { useEffect, useState } from 'react';
import { Users, Mail, BarChart } from 'lucide-react';
import { useData } from '@/context/dataContext';
import { newsletterAPI } from '@/services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Newsletter } from '@/types';

const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B'];

export default function DashboardPage() {
  const { subscribers } = useData();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);

  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        const data = await newsletterAPI.getAll();
        if (data) {
          setNewsletters(data);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
  
    fetchNewsletters();
  }, []);

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

  const newsletterData = [
    { name: 'Sent', value: newsletters.filter(n => n.status === 'sent').length },
    { name: 'Draft', value: newsletters.filter(n => n.status === 'draft').length },
    { name: 'Scheduled', value: newsletters.filter(n => n.status === 'scheduled').length }
  ];

  const subscriberData = [
    { name: 'Recent', value: recentSubscribers.length },
    { name: 'Existing', value: subscribers.length - recentSubscribers.length }
  ];
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

  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold font-inter mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Dashboard Overview
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  <metric.icon className="w-6 h-6 text-blue-500" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl
            border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
            <h2 className="text-xl font-semibold font-inter mb-6">Newsletter Distribution</h2>
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
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
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

          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl
            border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
            <h2 className="text-xl font-semibold font-inter mb-6">Subscriber Growth</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subscriberData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {subscriberData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
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
        </div>
      </div>
    </div>
  );
}
