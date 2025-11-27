'use client';

import React from 'react';
import Button from '../UI/Button';
import Container from '../UI/Container';
import { ArrowRight, Sparkles, Zap, Mail } from 'lucide-react';
import { pricingPlans, startFreeTrial } from '../../services/api';
import { findUserEmail, recordTrialAttempt } from '../../utils/trialTracking';

interface HeroProps {
  isRenewal?: boolean;
}

const Hero: React.FC<HeroProps> = ({ isRenewal = false }) => {
  const handleStartTrial = async () => {
    const email = findUserEmail();
    recordTrialAttempt(email);
    await startFreeTrial(pricingPlans[0], email);
  };

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 mesh-gradient-dark opacity-60" />
      
      {/* Animated gradient orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary-500/30 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow" />

      <Container size="xl" className="relative z-10 py-20">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
          {/* Hero Text Section */}
          <div className="flex-1 text-center lg:text-left space-y-8 animate-fade-in-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-primary-400" />
              <span className="text-sm font-medium text-primary-300">
                {isRenewal ? 'Welcome Back!' : 'AI-Powered Newsletter Platform'}
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold font-display leading-tight">
              <span className="block text-white mb-2">
                {isRenewal ? 'Continue Your' : 'Newsletter'}
              </span>
              <span className="gradient-text block">
                {isRenewal ? 'Journey' : 'Automation'}
              </span>
              <span className="block text-white mt-2">
                {isRenewal ? 'With Us' : 'Made Simple'}
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-lg sm:text-xl md:text-2xl text-neutral-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              {isRenewal
                ? 'Renew your subscription to continue enjoying all premium features and unlock unlimited possibilities.'
                : 'Create, schedule, and send beautiful newsletters that convert. Powered by AI, built for growth.'}
            </p>

            {/* Feature Pills */}
            {!isRenewal && (
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-neutral-400">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-secondary-400" />
                  <span>AI-Powered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-accent-400" />
                  <span>Smart Analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-400" />
                  <span>14-Day Free Trial</span>
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <Button 
                variant="gradient" 
                size="lg"
                onClick={handleStartTrial}
                rightIcon={<ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />}
                className="group w-full sm:w-auto"
              >
                {isRenewal ? 'Renew Subscription' : 'Start Free Trial'}
              </Button>
              
              {!isRenewal && (
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full sm:w-auto border-neutral-700 hover:border-primary-500"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Explore Features
                </Button>
              )}
            </div>

            {/* Social Proof */}
            {!isRenewal && (
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6 pt-6 text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 border-2 border-neutral-900" />
                    ))}
                  </div>
                  <span className="text-neutral-400">
                    <span className="text-white font-semibold">500+</span> users
                  </span>
                </div>
                <div className="h-4 w-px bg-neutral-700" />
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                  <span className="ml-2 text-neutral-400">4.9/5 rating</span>
                </div>
              </div>
            )}
          </div>

          {/* Demo Video Section */}
          {!isRenewal && (
            <div className="flex-1 w-full lg:w-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
                
                {/* Video container */}
                {/* <div className="relative glass-strong rounded-2xl overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/50 to-transparent z-10 pointer-events-none" />
                  
                  <video
                    src="/Sendstream-Demo.mp4"
                    controls
                    autoPlay
                    muted
                    loop
                    className="w-full aspect-video object-cover"
                  />
                </div> */}

                {/* Floating badge */}
                {/* <div className="absolute -bottom-4 -right-4 glass px-4 py-2 rounded-xl shadow-glow">
                  <span className="text-sm font-medium gradient-text">Watch Demo</span>
                </div> */}
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-neutral-950 to-transparent" />
    </section>
  );
};

export default Hero;
