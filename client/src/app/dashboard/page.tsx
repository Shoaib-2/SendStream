// src/app/dashboard/page.tsx
"use client";
import React from 'react';
import { Users, Mail, BarChart } from 'lucide-react';

export default function DashboardPage() {
  const metrics = [
    {
      label: 'Total Subscribers',
      value: '1,234',
      change: '+12.5%',
      icon: Users
    },
    {
      label: 'Newsletters Sent',
      value: '45',
      change: '-2.4%',
      icon: Mail
    },
    {
      label: 'Open Rate',
      value: '68%',
      change: '+8.2%',
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
              <span className={`text-sm ${
                metric.change.startsWith('+') ? 'text-green-500' : 'text-red-500'
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