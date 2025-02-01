// src/components/sections/Integration.tsx
import React from 'react';
import { Mail, Settings } from 'lucide-react';

/**
 * Integration platform interface defining the structure
 * of each integration platform's data
 */
interface IntegrationPlatform {
  icon: React.ReactNode;
  name: string;
  description: string;
}

/**
 * Array of supported integration platforms
 * Can be easily extended to add more platforms in the future
 */
const platforms: IntegrationPlatform[] = [
  {
    icon: <Mail className="w-8 h-8 text-blue-500" />,
    name: "Mailchimp",
    description: "Connect your Mailchimp account for automated newsletter distribution"
  },
  {
    icon: <Settings className="w-8 h-8 text-blue-500" />,
    name: "Substack",
    description: "Integrate with Substack to streamline your publishing workflow"
  }
];

/**
 * Integration section component showcasing available platform integrations
 * Uses a grid layout for responsive design
 */
const Integration: React.FC = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16" aria-labelledby="integrations-title">
      <h2 
        id="integrations-title" 
        className="text-3xl font-bold text-center mb-12"
      >
        Seamless Integrations
      </h2>
      <div className="grid md:grid-cols-2 gap-8">
        {platforms.map((platform, index) => (
          <div 
            key={index}
            className="bg-gray-800 p-6 rounded-lg text-center transform hover:scale-105 transition-transform duration-200"
          >
            {/* Platform icon container */}
            <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
              {platform.icon}
            </div>
            
            {/* Platform details */}
            <h3 className="text-xl font-semibold mb-2">{platform.name}</h3>
            <p className="text-gray-400">{platform.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Integration;