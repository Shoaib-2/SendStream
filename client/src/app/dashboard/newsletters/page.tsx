"use client";
import React from 'react';
import { Mail, Send, Plus, Pencil, Clock} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { newsletterAPI } from '../../../services/api';

interface Newsletter {
  id?: string;
  _id?: string;
  title: string;
  status: 'draft' | 'scheduled' | 'sent';
  sentDate?: string;
  scheduledDate?: string;
  contentQuality?: {
    isOriginalContent: boolean;
    hasResearchBacked: boolean;
    hasActionableInsights: boolean;
    contentLength: number;
    sources: string[];
    keyTakeaways: string[];
    qualityScore: number;
  };
}

interface NewsletterResponse {
  newsletters: Newsletter[];
  qualityStats: {
    averageScore: number;
    qualityDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    topPerformers: Newsletter[];
  };
}

const NewsletterDashboard = () => {
  const router = useRouter();
  const [newsletters, setNewsletters] = React.useState<Newsletter[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [qualityStats, setQualityStats] = React.useState<NewsletterResponse['qualityStats'] | null>(null);

  const fetchNewsletterStats = React.useCallback(async () => {
    try {
      const response = await newsletterAPI.getNewsletterStats();
      
      if (response && response.newsletters) {
        setNewsletters(response.newsletters);
        setQualityStats(response.qualityStats);
      } else {
        console.error('Invalid response format:', response);
        setNewsletters([]);
        setQualityStats(null);
      }
    } catch (error) {
      console.error('Error fetching newsletters:', error);
      setNewsletters([]);
      setQualityStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

React.useEffect(() => {
    fetchNewsletterStats();

    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}`);
    
    // Only set up the message listener after the connection is open
    ws.onopen = () => {
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'newsletter_update') {
          fetchNewsletterStats();
        }
      };
    };

    // Close the WebSocket only if it's in a connected state
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [fetchNewsletterStats]);

  const metrics = [
    { 
      id: 'total-newsletters', 
      label: 'Total Newsletters', 
      value: Array.isArray(newsletters) ? newsletters.length : 0, 
      icon: Mail 
    },
    { 
      id: 'sent-newsletters', 
      label: 'Sent', 
      value: Array.isArray(newsletters) ? newsletters.filter(n => n.status === 'sent').length : 0, 
      icon: Send 
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
    <div className="p-4 sm:p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-inter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Newsletter Dashboard
          </h1>
          <button
            className="w-full sm:w-auto bg-blue-500 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium
              transform transition-all duration-300 hover:scale-105 hover:bg-blue-600 
              inline-flex items-center justify-center sm:justify-start gap-2"
            onClick={handleCreateClick}
          >
            <Plus className="w-4 h-4" />
            Create Newsletter
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {metrics.map((metric) => (
            <div 
              key={metric.id} 
              className="bg-gray-800/50 backdrop-blur-sm p-4 sm:p-6 rounded-2xl
                border border-gray-800 hover:border-blue-500/50
                transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center
                  group-hover:scale-110 transition-all duration-300">
                  <metric.icon className="w-5 sm:w-6 h-5 sm:h-6 text-blue-500" />
                </div>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm font-inter">{metric.label}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 font-inter">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl overflow-hidden
          border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-700/50">
            <h2 className="text-lg sm:text-xl font-semibold font-inter">Recent Newsletters</h2>
          </div>
          <div className="divide-y divide-gray-700/50">
            {newsletters.map((newsletter) => (
              <div
                key={newsletter.id || newsletter._id}
                className="p-4 sm:p-6 hover:bg-blue-500/5 transition-all duration-300 cursor-pointer"
                onClick={() => newsletter.status === 'draft' && 
                  router.push(`/dashboard/newsletters/create?id=${newsletter.id || newsletter._id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2">
                  <h3 className="font-medium font-inter line-clamp-2 sm:line-clamp-1">{newsletter.title}</h3>
                  <div className="flex items-center gap-2 sm:gap-4">
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
                    <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
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
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400 font-inter">
                  {newsletter.scheduledDate && (
                    <span className="flex items-center gap-2">
                      <Clock className="w-3 sm:w-4 h-3 sm:h-4 text-blue-400" />
                      <span className="truncate">
                        Scheduled: {new Date(newsletter.scheduledDate).toLocaleString()}
                      </span>
                    </span>
                  )}
                  {newsletter.sentDate && (
                    <span className="flex items-center gap-2">
                      <Send className="w-3 sm:w-4 h-3 sm:h-4 text-green-400" />
                      <span className="truncate">
                        Sent: {new Date(newsletter.sentDate).toLocaleString()}
                      </span>
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