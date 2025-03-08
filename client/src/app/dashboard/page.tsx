"use client";
import React, { useEffect, useState } from 'react';
import { Users, Mail, Star, BookOpen} from 'lucide-react';
import { useData } from '@/context/dataContext';
import { newsletterAPI } from '@/services/api';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { Newsletter } from '@/types';

const COLORS = ['#3B82F6', '#10B981', '#EF4444', '#F59E0B'];

interface QualityMetrics {
  originalContent: boolean;
  researchBased: boolean;
  actionableInsights: boolean;
  comprehensiveAnalysis: boolean;
}

export default function DashboardPage() {
  const { subscribers } = useData();
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics[]>([]);

  useEffect(() => {
    const fetchNewsletters = async () => {
      try {
        const data = await newsletterAPI.getAll();
        if (data) {
          const transformedData = data.map(newsletter => ({
            ...newsletter
          }));
          setNewsletters(transformedData);
          // Use actual content quality data from the API
          setQualityMetrics(data.map(newsletter => ({
            originalContent: newsletter.contentQuality?.isOriginalContent || false,
            researchBased: newsletter.contentQuality?.hasResearchBacked || false,
            actionableInsights: newsletter.contentQuality?.hasActionableInsights || false,
            comprehensiveAnalysis: newsletter.contentQuality?.contentLength ? newsletter.contentQuality.contentLength > 500 : false
          })));
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

  const activeSubscribers = subscribers.filter(s => s.status === 'active');

  // Calculate content quality scores
  const getQualityScore = (newsletter: Newsletter) => {
    return newsletter.contentQuality?.qualityScore || 0;
  };

  const averageQualityScore = newsletters.reduce((acc, curr) => 
    acc + getQualityScore(curr), 0) / newsletters.length;

  const metrics = [
    {
      label: 'Total Subscribers',
      value: activeSubscribers.length,
      change: activeSubscribers.length - recentSubscribers.length > 0
        ? `${(((recentSubscribers.length - (activeSubscribers.length - recentSubscribers.length)) / 
            (activeSubscribers.length - recentSubscribers.length)) * 100).toFixed(1)}%`
        : recentSubscribers.length > 0 ? '100%' : '0%',
      icon: Users,
      color: 'text-blue-500'
    },
    {
      label: 'Newsletters Sent',
      value: sentNewsletters.length,
      change: sentNewsletters.length - recentNewsletters.length > 0
        ? `${(((recentNewsletters.length - (sentNewsletters.length - recentNewsletters.length)) / 
            (sentNewsletters.length - recentNewsletters.length)) * 100).toFixed(1)}%`
        : recentNewsletters.length > 0 ? '100%' : '0%',
      icon: Mail,
      color: 'text-green-500'
    },
    {
      label: 'Content Quality',
      value: `${averageQualityScore.toFixed(0)}%`,
      change: newsletters.length > 1
        ? `${(((averageQualityScore - (newsletters.slice(0, -1).reduce((acc, curr) => acc + getQualityScore(curr), 0) / (newsletters.length - 1))) / 
            (newsletters.slice(0, -1).reduce((acc, curr) => acc + getQualityScore(curr), 0) / (newsletters.length - 1))) * 100).toFixed(1)}%`
        : '0%',
      icon: Star,
      color: 'text-yellow-500'
    },
    {
      label: 'Research Score',
      value: qualityMetrics.filter(m => m.researchBased).length,
      change: qualityMetrics.length > 0
        ? `${((qualityMetrics.filter(m => m.researchBased).length / qualityMetrics.length) * 100).toFixed(1)}%`
        : '0%',
      icon: BookOpen,
      color: 'text-purple-500'
    }
  ];

  const newsletterData = [
    { name: 'Original', value: qualityMetrics.filter(m => m.originalContent).length },
    { name: 'Research-Based', value: qualityMetrics.filter(m => m.researchBased).length },
    { name: 'Actionable', value: qualityMetrics.filter(m => m.actionableInsights).length }
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
          Content Quality Dashboard
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                  <metric.icon className={`w-6 h-6 ${metric.color}`} />
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-6">Content Quality Distribution</h2>
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

          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl">
            <h2 className="text-xl font-semibold mb-4">Latest Newsletter Insights</h2>
            <div className="space-y-4">
              {newsletters.slice(0, 3).map((newsletter, idx) => (
                <div key={idx} className="p-4 bg-gray-700/20 rounded-lg">
                  <h3 className="font-medium mb-2">{newsletter.title}</h3>
                  <div className="flex flex-wrap gap-2">
                    {qualityMetrics[idx]?.originalContent && (
                      <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                        Original Content
                      </span>
                    )}
                    {qualityMetrics[idx]?.researchBased && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                        Research-Based
                      </span>
                    )}
                    {qualityMetrics[idx]?.actionableInsights && (
                      <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">
                        Actionable Insights
                      </span>
                    )}
                    {qualityMetrics[idx]?.comprehensiveAnalysis && (
                      <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full">
                        Comprehensive
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="text-sm text-gray-400">
                    Quality Score: {getQualityScore(newsletters[idx])}%
                    </span>
                    <span className="text-sm text-gray-400">
                      {new Date(newsletter.sentDate || '').toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>  
        </div>
      </div>
    </div>
  );
}