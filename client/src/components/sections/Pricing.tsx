'use client';

import React from 'react';
import { Check, Zap, Sparkles, ArrowRight, Star } from 'lucide-react';
import Button from '../UI/Button';
import Card from '../UI/Card';
import Badge from '../UI/Badge';
import Container from '../UI/Container';
import { pricingPlans, startFreeTrial } from '../../../src/services/api';
import { findUserEmail, recordTrialAttempt } from '../../utils/trialTracking';

interface PricingProps {
  isRenewal?: boolean;
}

const Pricing: React.FC<PricingProps> = ({ isRenewal = false }) => {
  const pricingTier = pricingPlans[0]; // Use the Pro plan from our stripe integration

  const handleStartTrial = async () => {
    const email = findUserEmail();
    recordTrialAttempt(email);
    
    console.log('Pricing - Email for checkout:', { email });
    await startFreeTrial(pricingTier, email);
  };

  const features = [
    { text: "Unlimited subscribers", highlight: true },
    { text: "Advanced analytics & reporting", highlight: true },
    { text: "AI-powered scheduling", highlight: false },
    { text: "Priority support 24/7", highlight: false },
    { text: "API access & webhooks", highlight: false },
    { text: "Custom integrations", highlight: false },
    { text: "White-label options", highlight: false },
    { text: "Dedicated account manager", highlight: false },
  ];

  return (
    <section className="relative py-20 sm:py-24 lg:py-28 overflow-hidden bg-neutral-950" id="pricing">
      {/* Background effects */}
      <div className="absolute inset-0 mesh-gradient-dark opacity-40" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />

      <Container size="lg" className="relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4 animate-fade-in-up">
          <Badge variant="secondary" size="lg">
            <Sparkles className="w-4 h-4 mr-1" />
            {isRenewal ? 'Renew & Save' : 'Simple Pricing'}
          </Badge>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display">
            <span className="block text-white mb-2">
              {isRenewal ? 'Welcome Back!' : 'One Plan'}
            </span>
            <span className="gradient-text-secondary">
              {isRenewal ? 'Continue Your Journey' : 'All Features'}
            </span>
          </h2>
          
          <p className="text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            {isRenewal 
              ? 'Continue accessing all premium features and unlock your newsletter\'s full potential' 
              : 'Start free, upgrade when you\'re ready. No hidden fees. Cancel anytime.'}
          </p>
        </div>

        {/* Pricing Card */}
        <div className="max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Card variant="gradient" className="relative overflow-hidden">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-accent-500 to-secondary-500 
              rounded-2xl blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
            
            <div className="relative p-8 sm:p-10 lg:p-12">
              {/* Popular badge */}
              {!isRenewal && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                  <Badge variant="primary" size="lg" className="shadow-glow-lg">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    Most Popular
                  </Badge>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-8 pt-4">
                <h3 className="text-3xl font-bold font-display text-white mb-3">
                  {pricingTier.name}
                </h3>
                <p className="text-neutral-300 text-lg mb-6">
                  Everything you need to create and grow your newsletter
                </p>
                
                {/* Price */}
                <div className="flex items-baseline justify-center gap-2 mb-6">
                  <span className="text-6xl sm:text-7xl font-bold gradient-text">
                    {pricingTier.price}
                  </span>
                  <span className="text-2xl text-neutral-400">
                    {pricingTier.period}
                  </span>
                </div>

                {/* Trial badge */}
                {!isRenewal && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full 
                    bg-secondary-500/10 border border-secondary-500/20">
                    <Zap className="w-4 h-4 text-secondary-400" />
                    <span className="text-sm font-medium text-secondary-300">
                      {pricingTier.trialDays}-day free trial • No credit card required
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="mb-8">
                <p className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                  What&apos;s Included
                </p>
                <ul className="space-y-4">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 group">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                        ${feature.highlight 
                          ? 'bg-primary-500/20 text-primary-400' 
                          : 'bg-neutral-800 text-neutral-400'
                        } group-hover:scale-110 transition-transform`}>
                        <Check className="w-4 h-4" strokeWidth={3} />
                      </div>
                      <span className={`text-lg ${feature.highlight ? 'text-white font-medium' : 'text-neutral-300'}`}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <Button 
                variant="gradient" 
                size="xl"
                onClick={handleStartTrial}
                rightIcon={<ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />}
                className="w-full group shadow-glow-lg"
              >
                {isRenewal ? 'Renew Subscription' : 'Start Free Trial'}
              </Button>

              {/* Trust indicators */}
              <div className="mt-8 pt-6 border-t border-neutral-800">
                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-neutral-400">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Secure checkout</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                    <span>Cancel anytime</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>Money-back guarantee</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Bottom note */}
        <div className="mt-12 text-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-neutral-500 text-sm">
            Have questions? <button className="text-primary-400 hover:text-primary-300 font-medium underline">
              Contact our sales team
            </button>
          </p>
        </div>
      </Container>
    </section>
  );
};

export default Pricing;