import React from 'react';
import { Send, Users, ChartBar, Globe } from 'lucide-react';

const features = [
  {
    icon: <Send className="w-6 h-6" />,
    title: "Smart Scheduling",
    description: "Optimized to reach your audience when they're most engaged."
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Audience Insights",
    description: "Deep analytics on subscriber behavior and engagement patterns."
  },
  {
    icon: <ChartBar className="w-6 h-6" />,
    title: "Performance Analytics",
    description: "Real-time metrics and actionable insights to grow your audience."
  },
  {
    icon: <Globe className="w-6 h-6" />,
    title: "Global Reach",
    description: "Automatic timezone detection and localized sending for worldwide audience."
  }
];

const Features = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-inter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Powerful Features
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Everything you need to create, manage, and grow your newsletter presence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl group
                hover:bg-gray-800 transition-all duration-300
                border border-gray-800 hover:border-blue-500/50"
            >
              <div className="flex items-start gap-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center
                  group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300">
                  <div className="text-blue-500">{feature.icon}</div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2 font-inter text-white">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;