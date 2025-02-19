import React from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import Button from '../UI/Button';

const Integration = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent" />
      
      <div className="max-w-6xl mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold font-inter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              Seamless Integration
            </h2>
            <p className="text-xl text-gray-400">
              Connect with your favorite email service provider in minutes
            </p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-sm p-8 md:p-12 rounded-2xl
            border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
              <div className="w-24 h-24 bg-blue-500/10 rounded-2xl flex items-center justify-center
                group-hover:scale-110 transition-all duration-300">
                <Mail className="w-12 h-12 text-blue-500" />
              </div>

              <div className="flex-grow text-center md:text-left">
                <h3 className="text-2xl font-semibold mb-4 font-inter">Mailchimp Integration</h3>
                <p className="text-gray-400 mb-6 max-w-xl">
                  Connect your Mailchimp account to automatically sync subscribers, 
                  send newsletters, and track performance metrics in real-time.
                </p>
                <Button variant="outline" className="group">
                  Connect with Mailchimp
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Integration;