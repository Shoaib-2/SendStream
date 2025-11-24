// For local development, use: http://localhost:3000
// Deployment link: https://client-3ye4.onrender.com

"use client";
import React from 'react';
import { Users, Mail } from 'lucide-react';
import { ResponsiveLine } from '@nivo/line';

import { analyticsAPI } from '../../../services/api';
import { useData } from '../../../context/dataContext';
import type { ApiAnalyticsSummary, GrowthData as AppGrowthData } from '../../../types';
import Container from '@/components/UI/Container';
import Card from '@/components/UI/Card';
import Badge from '@/components/UI/Badge';

export default function AnalyticsDashboard() {
  const { subscribers } = useData();
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState<ApiAnalyticsSummary | null>(null);
  const [growthData, setGrowthData] = React.useState<AppGrowthData[]>([]);  const [recentActivity, setRecentActivity] = React.useState<Array<{
    title: string;
    recipients: number;
    time: string;
  }>>([]);

  React.useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch summary data
        const response = await analyticsAPI.getSummary();
        const data = (response.data && typeof response.data === 'object' && 'data' in response.data)
          ? (response.data as { data: ApiAnalyticsSummary }).data
          : (response.data as ApiAnalyticsSummary);
        
        if (response.status === 'success' && data) {
          setSummary({
            subscribers: data.subscribers,
            newsletters: data.newsletters,
          });
          
          // Fetch recent activity
          setRecentActivity(data.recentActivity || []);
        }
        
        // Simplified growth data fetching with proper error handling
        try {
          // console.log('Fetching growth data...');
          // Fetch growth data for 6 months
          const growthResponse = await analyticsAPI.getGrowthData('6month');
          
          // Handle the API response structure properly
          if (growthResponse && typeof growthResponse === 'object' && 'status' in growthResponse) {
            // API returned the standard wrapper format
            const apiResponse = growthResponse as unknown as { status: string; data: AppGrowthData[] };
            
            if (apiResponse.status === 'success' && Array.isArray(apiResponse.data)) {
              const formattedData: AppGrowthData[] = apiResponse.data.map((item: AppGrowthData) => {
                const monthValue = item.month || 
                                (item.date ? new Date(item.date).toLocaleString('default', { month: 'short' }) : '');
                return {
                  month: monthValue,
                  subscribers: Number(item.subscribers || 0)
                };
              });
              
              // console.log('Formatted growth data:', formattedData);
              setGrowthData(formattedData);
              return; // Exit early after setting growth data
            }
          }
          
          // Handle case where API directly returns an array
          if (Array.isArray(growthResponse) && growthResponse.length > 0) {
            const formattedData: AppGrowthData[] = (growthResponse as AppGrowthData[]).map((item) => {
              const monthValue = item.month || 
                               (item.date ? new Date(item.date).toLocaleString('default', { month: 'short' }) : '');
              return {
                month: monthValue,
                subscribers: Number(item.subscribers || 0)
              };
            });
            setGrowthData(formattedData);
          } else {
            // Only use mock data if no data was returned at all
            throw new Error('No growth data returned from API');
          }
        } catch (error) {
          console.error('Growth data fetch error:', error instanceof Error ? error.message : 'Unknown error');
          
          // Set fallback data
          const mockData: AppGrowthData[] = [
            { month: 'Jan', subscribers: 100 },
            { month: 'Feb', subscribers: 120 },
            { month: 'Mar', subscribers: 150 },
            { month: 'Apr', subscribers: 180 },
            { month: 'May', subscribers: 210 }
          ];
          setGrowthData(mockData);
          console.log('Using fallback growth data');
        }
      } catch (error) {
        console.error('Analytics fetch error:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [subscribers]);

  if (loading || !summary) {
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

  const metrics = [
    {
      label: 'Total Subscribers',
      value: subscribers.filter(s => s.status === 'active').length.toLocaleString(),
      change: summary.subscribers?.change || 0,
      icon: Users
    },
    {
      label: 'Newsletters Sent',
      value: summary.newsletters?.total?.toLocaleString() || '0',
      change: summary.newsletters?.change || 0,
      icon: Mail
    }
  ];

  // Get average and maximum values for reference line
  const averageSubscribers = growthData.length 
    ? Math.round(growthData.reduce((sum, item) => sum + (item.subscribers ?? 0), 0) / growthData.length)
    : 0;


  return (
    <div className="p-6 min-h-screen">
      <Container size="xl">
        <h1 className="text-3xl md:text-4xl font-bold font-display mb-8 gradient-text">
          Analytics Overview
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {metrics.map((metric, idx) => (
            <Card 
              key={idx}
              variant="hover"
              padding="lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="relative w-12 h-12 rounded-xl flex items-center justify-center
                  group-hover:scale-110 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl blur-md opacity-50" />
                  <div className="relative w-full h-full bg-gradient-to-br from-primary-500/20 to-primary-600/20 rounded-xl 
                    flex items-center justify-center border border-primary-500/30">
                    <metric.icon className="w-6 h-6 text-primary-400" />
                  </div>
                </div>
                <Badge
                  variant={metric.change >= 0 ? 'success' : 'error'}
                  size="sm"
                >
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-neutral-400 text-sm font-inter">{metric.label}</p>
              <p className="text-2xl font-bold mt-1 font-display text-white">{metric.value}</p>
            </Card>
          ))}
        </div>

        <Card variant="glass" padding="lg" className="mb-8">
          <h2 className="text-xl font-bold font-display mb-6 text-white">Subscriber Growth</h2>          <div className="h-64">
            <ResponsiveLine
              data={[{
                id: 'subscribers',
                data: growthData.map(d => ({
                  x: d.month ?? '',
                  y: d.subscribers ?? 0
                }))
              }]}
              margin={{ top: 10, right: 40, left: 40, bottom: 30 }}
              curve="monotoneX"
              enableArea={true}
              areaBaselineValue={0}
              areaOpacity={0.3}
              enablePoints={true}
              pointSize={8}
              pointColor="#fff"
              pointBorderWidth={2}
              pointBorderColor="#a855f7"
              colors={["#a855f7"]}
              theme={{
                grid: {
                  line: {
                    stroke: "#334155",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                    opacity: 0.3
                  }
                },
                axis: {
                  ticks: {
                    text: {
                      fill: "#94a3b8",
                      fontSize: 12
                    }
                  }
                },
                tooltip: {
                  container: {
                    background: "transparent",
                    color: "#F3F4F6",
                    fontSize: 12,
                    borderRadius: 8,
                    boxShadow: "none",
                    padding: 0
                  }
                }
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: 0
              }}
              axisBottom={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: 0
              }}
              gridYValues={5}
              enableGridX={false}
              markers={[
                {
                  axis: 'y',
                  value: averageSubscribers,
                  lineStyle: { stroke: '#64748b', strokeDasharray: '3 3' },
                  legend: 'Average',
                  legendPosition: 'right',
                  legendOrientation: 'vertical',
                  textStyle: { fill: '#64748b', fontSize: 12 }
                }
              ]}
              useMesh={true}
              enableSlices="x"
              sliceTooltip={({ slice }) => (
                <div className="glass-strong p-4 rounded-lg border border-white/20 shadow-glow">
                  <p className="text-neutral-300 font-medium mb-1">
                    {slice.points[0].data.x as string}
                  </p>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-primary-500 mr-2"></div>
                    <p className="text-primary-400 font-bold">
                      {slice.points[0].data.y ? (slice.points[0].data.y as number).toLocaleString() : 0} subscribers
                    </p>
                  </div>
                  {(slice.points[0].data.y as number) > averageSubscribers && (
                    <p className="text-success-400 text-xs mt-2">Above average</p>
                  )}
                </div>
              )}
            />
          </div>
        </Card>

        <Card variant="glass" padding="lg">
          <h2 className="text-xl font-bold font-display mb-6 text-white">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <div key={idx} 
                className="flex justify-between items-center py-3 border-b border-white/10 
                  hover:border-primary-500/20 transition-colors">
                <div>
                  <p className="font-medium font-inter text-white">{activity.title}</p>
                  <p className="text-sm text-neutral-400">{activity.recipients} recipients</p>
                </div>
                <span className="text-sm text-neutral-400">
                  {new Date(activity.time).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </Container>
    </div>
  );
}