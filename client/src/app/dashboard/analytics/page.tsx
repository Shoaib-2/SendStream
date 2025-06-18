"use client";
import React from 'react';
import { Users, Mail } from 'lucide-react';
import { ResponsiveLine } from '@nivo/line';

import { analyticsAPI } from '../../../services/api';
import { useData } from '../../../context/dataContext';
import type { ApiAnalyticsSummary, GrowthData as AppGrowthData } from '../../../types';

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
            const formattedData: AppGrowthData[] = growthResponse.map((item: AppGrowthData) => {
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
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
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
    <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold font-inter mb-8 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
          Analytics Overview
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {metrics.map((metric, idx) => (
            <div 
              key={idx}
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
                  metric.change >= 0 
                    ? 'text-green-400 bg-green-500/10' 
                    : 'text-red-400 bg-red-500/10'
                }`}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </span>
              </div>
              <p className="text-gray-400 text-sm font-inter">{metric.label}</p>
              <p className="text-2xl font-bold mt-1 font-inter">{metric.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 
          hover:border-blue-500/50 transition-all duration-300 mb-8">
          <h2 className="text-xl font-bold font-inter mb-6">Subscriber Growth</h2>          <div className="h-64">
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
              pointBorderColor="#3B82F6"
              colors={["#3B82F6"]}
              theme={{
                grid: {
                  line: {
                    stroke: "#374151",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                    opacity: 0.3
                  }
                },
                axis: {
                  ticks: {
                    text: {
                      fill: "#9CA3AF",
                      fontSize: 12
                    }
                  }
                },
                tooltip: {
                  container: {
                    background: "#1F2937",
                    color: "#F3F4F6",
                    fontSize: 12,
                    borderRadius: 8,
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    padding: "8px 12px"
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
                  lineStyle: { stroke: '#9CA3AF', strokeDasharray: '3 3' },
                  legend: 'Average',
                  legendPosition: 'right',
                  legendOrientation: 'vertical',
                  textStyle: { fill: '#9CA3AF', fontSize: 12 }
                }
              ]}
              useMesh={true}
              enableSlices="x"
              sliceTooltip={({ slice }) => (
                <div className="bg-gray-800 p-4 rounded-lg border border-blue-500/30 shadow-lg shadow-blue-500/10">
                  <p className="text-gray-300 font-medium mb-1">
                    {slice.points[0].data.x as string}
                  </p>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <p className="text-blue-400 font-bold">
                      {slice.points[0].data.y ? (slice.points[0].data.y as number).toLocaleString() : 0} subscribers
                    </p>
                  </div>
                  {(slice.points[0].data.y as number) > averageSubscribers && (
                    <p className="text-green-400 text-xs mt-2">Above average</p>
                  )}
                </div>
              )}
            />
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl border border-gray-800 
          hover:border-blue-500/50 transition-all duration-300">
          <h2 className="text-xl font-bold font-inter mb-6">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((activity, idx) => (
              <div key={idx} 
                className="flex justify-between items-center py-3 border-b border-gray-700/50 
                  hover:border-blue-500/20 transition-colors">
                <div>
                  <p className="font-medium font-inter">{activity.title}</p>
                  <p className="text-sm text-gray-400">{activity.recipients} recipients</p>
                </div>
                <span className="text-sm text-gray-400">
                  {new Date(activity.time).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}