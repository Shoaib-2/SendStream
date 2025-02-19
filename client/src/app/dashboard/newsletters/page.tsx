"use client";
import React from 'react';
import { BarChart, Mail, Send, LucideIcon, Plus, Pencil, Trash2, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { newsletterAPI } from '../../../services/api';

interface Newsletter {
  id?: string;
  _id?: string;
  title: string;
  status: 'draft' | 'scheduled' | 'sent';
  openRate: number;
  clickRate: number;
  sentDate?: string;
  scheduledDate?: string;
}

interface DashboardMetric {
  id: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
}

const NewsletterDashboard = () => {
  const router = useRouter();
  const [newsletters, setNewsletters] = React.useState<Newsletter[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchNewsletterStats = React.useCallback(async () => {
    try {
      const response = await newsletterAPI.getNewsletterStats();
      if (response) {
        setNewsletters(response);
      }
    } catch (error) {
      console.error('Error fetching newsletters:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchNewsletterStats();
    
    const ws = new WebSocket('ws://localhost:5000/ws');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'newsletter_update') {
        fetchNewsletterStats();
      }
    };
  
    return () => ws.close();
  }, [fetchNewsletterStats]);

  const metrics = [
    { id: 'total-newsletters', label: 'Total Newsletters', value: newsletters.length, icon: Mail },
    { id: 'sent-newsletters', label: 'Sent', value: newsletters.filter(n => n.status === 'sent').length, icon: Send },
    {
      id: 'avg-open-rate',
      label: 'Daily Open Rate',
      value: newsletters.length > 0
        ? `${(newsletters.reduce((sum, n) => sum + (n.openRate || 0), 0) / newsletters.length).toFixed(1)}%`
        : '0%',
      icon: BarChart
    }
  ];

  const handleCreateClick = () => {
    router.push('/dashboard/newsletters/create');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="w-16 h-16 relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-inter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Newsletter Dashboard
          </h1>
          <button
            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium
              transform transition-all duration-300 hover:scale-105 hover:bg-blue-600 
              inline-flex items-center gap-2"
            onClick={handleCreateClick}
          >
            <Plus className="w-4 h-4" />
            Create Newsletter
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {metrics.map((metric) => (
            <div 
              key={metric.id} 
              className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl
                border border-gray-800 hover:border-blue-500/50
                transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center
                  group-hover:scale-110 transition-all duration-300">
                  <metric.icon className="w-6 h-6 text-blue-500" />
                </div>
              </div>
              <p className="text-gray-400 text-sm font-inter">{metric.label}</p>
              <p className="text-2xl font-bold mt-1 font-inter">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden
          border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
          <div className="px-6 py-4 border-b border-gray-700/50">
            <h2 className="text-xl font-semibold font-inter">Recent Newsletters</h2>
          </div>
          <div className="divide-y divide-gray-700/50">
            {newsletters.map((newsletter) => (
              <div
                key={newsletter.id || newsletter._id}
                className="p-6 hover:bg-blue-500/5 transition-all duration-300 cursor-pointer"
                onClick={() => newsletter.status === 'draft' && 
                  router.push(`/dashboard/newsletters/create?id=${newsletter.id || newsletter._id}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium font-inter">{newsletter.title}</h3>
                  <div className="flex items-center gap-4">
                    {(newsletter.status === 'draft' || newsletter.status === 'scheduled') && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/newsletters/create?id=${newsletter.id || newsletter._id}`);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-400 transition-colors rounded-lg
                            hover:bg-blue-500/10"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      newsletter.status === 'sent' 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/50' 
                        : newsletter.status === 'scheduled' 
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/50' 
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/50'
                    }`}>
                      {newsletter.status === 'scheduled' ? 'Scheduled' : 
                        newsletter.status.charAt(0).toUpperCase() + newsletter.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 text-sm text-gray-400 font-inter">
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    Open Rate: {newsletter.openRate ? `${newsletter.openRate.toFixed(2)}%` : 'N/A'}
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    Click Rate: {newsletter.clickRate}%
                  </span>
                  {newsletter.scheduledDate && (
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-400" />
                      Scheduled: {new Date(newsletter.scheduledDate).toLocaleString()}
                    </span>
                  )}
                  {newsletter.sentDate && (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-green-400" />
                      Sent: {new Date(newsletter.sentDate).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsletterDashboard;