
import React from 'react';
import { Send, Users } from 'lucide-react';

const features = [
  {
    icon: <Send className="w-6 h-6" />,
    title: "Automated Scheduling",
    description: "Schedule newsletters across multiple platforms with a single click"
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: "Subscriber Management",
    description: "Unified dashboard to manage subscribers across Mailchimp and Substack"
  }
];

const Features = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="grid md:grid-cols-2 gap-8">
        {features.map((feature, index) => (
          <div 
            key={index} 
            className="bg-gray-800 p-6 rounded-lg text-center transform hover:scale-105 transition-transform duration-200"
          >
            <div className="text-blue-500 mb-4">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-400">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;