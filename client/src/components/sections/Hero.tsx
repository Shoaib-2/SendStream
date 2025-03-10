import React from 'react';
import Button from '../UI/Button';
import { Send, ArrowRight } from 'lucide-react';
import { pricingPlans, startFreeTrial } from '../../services/api';

interface HeroProps {
  isRenewal?: boolean;
}

const Hero: React.FC<HeroProps> = ({ isRenewal = false }) => {
  const handleStartTrial = async () => {
    await startFreeTrial(pricingPlans[0]); // Start trial with Pro plan
  };

  return (
    <header className="min-h-[90vh] flex items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent" />
      
      {/* Content container */}
      <div className="max-w-4xl mx-auto px-4 relative">
        <div className="text-center space-y-8">
          {/* Logo animation */}

          <h1 className="text-5xl md:text-7xl font-bold font-inter leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            {isRenewal 
              ? 'Welcome Back!' 
              : 'Newsletter Automation Made Simple'}
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 font-inter max-w-2xl mx-auto leading-relaxed">
            {isRenewal
              ? 'Renew your subscription to continue enjoying all premium features'
              : 'Create, schedule, and send newsletters that converts. All from one powerful dashboard.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button className="group" onClick={handleStartTrial}>
              {isRenewal ? 'Renew Now' : 'Start Free Trial'}
              <ArrowRight className="inline-block ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
            
            {!isRenewal && (
              <Button variant="outline">
                Watch Demo
              </Button>
            )}
          </div>

          {/* Social proof */}
          {/* <div className="pt-12 border-t border-gray-800 mt-16">
            <p className="text-gray-500 mb-4">Trusted by content creators worldwide</p>
            <div className="flex justify-center items-center gap-8">
              <div className="w-24 h-8 bg-gray-800 rounded animate-pulse" />
              <div className="w-24 h-8 bg-gray-800 rounded animate-pulse [animation-delay:200ms]" />
              <div className="w-24 h-8 bg-gray-800 rounded animate-pulse [animation-delay:400ms]" />
            </div>
          </div> */}
        </div>
      </div>
    </header>
  );
};

export default Hero;