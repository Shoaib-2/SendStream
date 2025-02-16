"use client";
import React from 'react';
import { BarChart, Mail, Send, LucideIcon } from 'lucide-react';
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
    // Fetch stats once per day at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    const timer = setTimeout(() => {
      fetchNewsletterStats();
      // After first execution, run every 24 hours
      setInterval(fetchNewsletterStats, 24 * 60 * 60 * 1000);
    }, timeUntilMidnight);

    return () => clearTimeout(timer);
  }, [fetchNewsletterStats]);

  const handleCreateClick = () => {
    router.push('/dashboard/newsletters/create');
  };

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

  if (loading) return <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Newsletter Dashboard</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
          onClick={handleCreateClick}
        >
          Create Newsletter
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric) => (
          <div key={metric.id} className="bg-gray-800 p-6 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <metric.icon className="w-5 h-5 text-blue-500" />
              <span className="text-gray-400">{metric.label}</span>
            </div>
            <p className="text-2xl font-bold">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="font-semibold">Recent Newsletters</h2>
        </div>
        <div className="divide-y divide-gray-700">
          {newsletters.map((newsletter) => (
            <div
              key={newsletter.id || newsletter._id}
              className="p-6 hover:bg-gray-750 transition-colors cursor-pointer"
              onClick={() => newsletter.status === 'draft' && router.push(`/dashboard/newsletters/create?id=${newsletter.id || newsletter._id}`)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{newsletter.title}</h3>
                <span className={`px-3 py-1 rounded-full text-sm ${newsletter.status === 'sent' ? 'bg-green-500/10 text-green-500' :
                    newsletter.status === 'scheduled' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-gray-500/10 text-gray-500'
                  }`}>
                  {newsletter.status === 'scheduled' ? 'Scheduled' : newsletter.status.charAt(0).toUpperCase() + newsletter.status.slice(1)}
                </span>
              </div>
              <div className="flex gap-4 text-sm text-gray-400">
                <span>Open Rate: {newsletter.openRate ? `${newsletter.openRate.toFixed(2)}%` : 'N/A'}</span>
                <span>Click Rate: {newsletter.clickRate}%</span>
                {newsletter.scheduledDate && (
                  <span>Scheduled for: {new Date(newsletter.scheduledDate).toLocaleString()}</span>
                )}
                {newsletter.sentDate && (
                  <span>Sent: {new Date(newsletter.sentDate).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NewsletterDashboard;