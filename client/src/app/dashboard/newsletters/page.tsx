"use client";
import React from 'react';
import { Mail, Send, Plus, Pencil, Clock} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { newsletterAPI } from '../../../services/api';
import Container from '@/components/UI/Container';
import Card from '@/components/UI/Card';
import Badge from '@/components/UI/Badge';
import Button from '@/components/UI/Button';

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

const NewsletterDashboard = () => {
  const router = useRouter();
  const [newsletters, setNewsletters] = React.useState<Newsletter[]>([]);
  const [loading, setLoading] = React.useState(true);

  const fetchNewsletterStats = React.useCallback(async () => {
    try {
      const response = await newsletterAPI.getNewsletterStats();
      
      if (response && response.newsletters) {
        setNewsletters(response.newsletters);
      } else {
        console.error('Invalid response format:', response);
        setNewsletters([]);
      }
    } catch (error) {
      console.error('Error fetching newsletters:', error);
      setNewsletters([]);
    } finally {
      setLoading(false);
    }
  }, []);

React.useEffect(() => {
    fetchNewsletterStats();

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://backend-9h3q.onrender.com/ws';
    const ws = new WebSocket(`${wsUrl}`);
    
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
          <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 blur-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 min-h-screen">
      <Container size="xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display gradient-text">
            Newsletter Dashboard
          </h1>
          <Button
            variant="gradient"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleCreateClick}
            className="w-full sm:w-auto"
          >
            Create Newsletter
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {metrics.map((metric) => (
            <Card 
              key={metric.id}
              variant="hover"
              padding="lg"
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="relative w-10 sm:w-12 h-10 sm:h-12 rounded-xl flex items-center justify-center
                  group-hover:scale-110 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl blur-md opacity-50" />
                  <div className="relative w-full h-full bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-xl 
                    flex items-center justify-center border border-primary-500/30">
                    <metric.icon className="w-5 sm:w-6 h-5 sm:h-6 text-primary-400" />
                  </div>
                </div>
              </div>
              <p className="text-neutral-400 text-xs sm:text-sm font-inter">{metric.label}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 font-display text-white">{metric.value}</p>
            </Card>
          ))}
        </div>

        <Card variant="glass" padding="none">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
            <h2 className="text-lg sm:text-xl font-semibold font-display text-white">Recent Newsletters</h2>
          </div>
          <div className="divide-y divide-white/10">
            {newsletters.map((newsletter) => (
              <div
                key={newsletter.id || newsletter._id}
                className="p-4 sm:p-6 hover:bg-gradient-to-r hover:from-primary-500/5 hover:to-secondary-500/5 
                  transition-all duration-300 cursor-pointer group"
                onClick={() => newsletter.status === 'draft' && 
                  router.push(`/dashboard/newsletters/create?id=${newsletter.id || newsletter._id}`)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2">
                  <h3 className="font-medium font-inter line-clamp-2 sm:line-clamp-1 text-white group-hover:text-primary-300 
                    transition-colors">{newsletter.title}</h3>
                  <div className="flex items-center gap-2 sm:gap-4">
                    {(newsletter.status === 'draft' || newsletter.status === 'scheduled') && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/newsletters/create?id=${newsletter.id || newsletter._id}`);
                          }}
                          className="p-2 text-neutral-400 hover:text-primary-400 transition-colors rounded-lg
                            hover:bg-primary-500/10 border border-transparent hover:border-primary-500/30"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <Badge 
                      variant={
                        newsletter.status === 'sent' ? 'success' : 
                        newsletter.status === 'scheduled' ? 'primary' : 
                        'default'
                      }
                      size="sm"
                    >
                      {newsletter.status === 'scheduled' ? 'Scheduled' : 
                        newsletter.status.charAt(0).toUpperCase() + newsletter.status.slice(1)}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm text-neutral-400 font-inter">
                  {newsletter.scheduledDate && (
                    <span className="flex items-center gap-2">
                      <Clock className="w-3 sm:w-4 h-3 sm:h-4 text-primary-400" />
                      <span className="truncate">
                        Scheduled: {new Date(newsletter.scheduledDate).toLocaleString()}
                      </span>
                    </span>
                  )}
                  {newsletter.sentDate && (
                    <span className="flex items-center gap-2">
                      <Send className="w-3 sm:w-4 h-3 sm:h-4 text-success-400" />
                      <span className="truncate">
                        Sent: {new Date(newsletter.sentDate).toLocaleString()}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </Container>
    </div>
  );
};

export default NewsletterDashboard;