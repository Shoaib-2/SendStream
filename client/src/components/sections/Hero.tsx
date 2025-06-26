import React from 'react';
import Button from '../UI/Button';
import { ArrowRight } from 'lucide-react';
import { pricingPlans, startFreeTrial } from '../../services/api';
import { findUserEmail, recordTrialAttempt } from '../../utils/trialTracking';

interface HeroProps {
  isRenewal?: boolean;
}

const Hero: React.FC<HeroProps> = ({ isRenewal = false }) => {
  const handleStartTrial = async () => {
    // Use utility functions instead of inline code
    const email = findUserEmail();
    recordTrialAttempt(email);
    
    // console.log('Hero - Email for checkout:', { email });
    await startFreeTrial(pricingPlans[0], email);
  };

  return (
    <header className="min-h-[90vh] flex items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent" />
      {/* Responsive flex container for text and video */}
      <div className="max-w-6xl mx-auto px-4 relative flex flex-col md:flex-row items-center justify-between gap-12 md:gap-8">
        {/* Hero Text Section */}
        <div className="flex-1 text-center md:text-left space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold font-inter leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            {isRenewal 
              ? 'Welcome Back!' 
              : 'Newsletter Automation Made Simple'}
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 font-inter max-w-2xl mx-auto md:mx-0 leading-relaxed">
            {isRenewal
              ? 'Renew your subscription to continue enjoying all premium features'
              : 'Create, schedule, and send newsletters that converts. All from one powerful dashboard.'}
          </p>
          <div className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-4 pt-4">
            <Button className="group" onClick={handleStartTrial}>
              {isRenewal ? 'Renew Now' : 'Start Free Trial'}
              <ArrowRight className="inline-block ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>
        {/* Inline Demo Video Section */}
        {!isRenewal && (
          <div className="flex-1 flex flex-col items-center justify-center w-full md:w-auto">
            <span className="mb-3 text-base md:text-lg text-blue-400 font-semibold tracking-wide text-center">Demo: How to use the application</span>
            <div
              className="relative w-full max-w-lg aspect-video rounded-2xl overflow-hidden shadow-2xl border border-gray-700 bg-black transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:scale-105 hover:shadow-3xl"
              style={{ willChange: 'transform' }}
            >
              <video
                src="/Sendstream-Demo.mp4"
                controls
                autoPlay
                muted
                loop
                poster="/public/video-poster.jpg"
                className="w-full h-full object-cover"
                style={{ minHeight: '240px', background: '#000' }}
              />
              {/* Optional: Add a subtle overlay or play icon for style */}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Hero;
