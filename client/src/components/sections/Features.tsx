'use client';

import React from 'react';
import { Send, Users, Sparkles, Zap, BarChart3, Shield } from 'lucide-react';
import Card from '../UI/Card';
import Container from '../UI/Container';
import Badge from '../UI/Badge';

const features = [
  {
    icon: Sparkles,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/10',
    title: "AI Content Generation",
    description: "Generate engaging, research-backed newsletter content in seconds. Get AI-powered subject lines, content improvements, and smart scheduling suggestions.",
    badge: "AI-Powered",
    highlight: true
  },
  {
    icon: Send,
    iconColor: 'text-primary-400',
    iconBg: 'bg-primary-500/10',
    title: "Smart Scheduling",
    description: "AI-powered timing optimization to reach your audience when they're most engaged. Automate your newsletter workflow.",
    badge: "Automated"
  },
  {
    icon: BarChart3,
    iconColor: 'text-secondary-400',
    iconBg: 'bg-secondary-500/10',
    title: "Advanced Analytics",
    description: "Real-time metrics, engagement tracking, and actionable insights to understand your audience better and grow faster.",
    badge: "Real-time"
  },
  {
    icon: Users,
    iconColor: 'text-accent-400',
    iconBg: 'bg-accent-500/10',
    title: "Audience Management",
    description: "Segment subscribers, track behavior patterns, and personalize content for maximum engagement and retention.",
    badge: "Smart"
  },
  {
    icon: Zap,
    iconColor: 'text-yellow-400',
    iconBg: 'bg-yellow-500/10',
    title: "Lightning Fast",
    description: "High-performance infrastructure ensures your newsletters are delivered instantly to thousands of subscribers.",
    badge: "Fast"
  },
  {
    icon: Shield,
    iconColor: 'text-green-400',
    iconBg: 'bg-green-500/10',
    title: "Secure & Compliant",
    description: "Enterprise-grade security, GDPR compliance, and automatic spam protection to keep your data safe.",
    badge: "Secure"
  }
];

const Features = () => {
  return (
    <section id="features" className="relative py-20 sm:py-24 lg:py-28 overflow-hidden bg-neutral-950">
      {/* Background effects */}
      <div className="absolute inset-0 mesh-gradient opacity-30" />
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-500/10 rounded-full blur-3xl" />

      <Container size="xl" className="relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4 animate-fade-in-up">
          <Badge variant="primary" size="lg">
            <Sparkles className="w-4 h-4 mr-1" />
            Powerful Features
          </Badge>
          
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display">
            <span className="block text-white mb-2">Everything You Need</span>
            <span className="gradient-text">To Succeed</span>
          </h2>
          
          <p className="text-base sm:text-lg md:text-xl text-neutral-300 max-w-3xl mx-auto leading-relaxed">
            Create, manage, and grow your newsletter with our comprehensive suite of tools designed for modern creators.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                variant="hover"
                className={`group relative overflow-hidden animate-fade-in-up ${
                  feature.highlight ? 'ring-2 ring-purple-500/30' : ''
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-500 rounded-2xl ${
                  feature.highlight 
                    ? 'from-purple-500/10 via-pink-500/10 to-purple-500/10 group-hover:from-purple-500/15 group-hover:via-pink-500/15 group-hover:to-purple-500/15'
                    : 'from-primary-500/0 via-accent-500/0 to-secondary-500/0 group-hover:from-primary-500/5 group-hover:via-accent-500/5 group-hover:to-secondary-500/5'
                }`} />
                
                {/* New Badge for AI Feature */}
                {feature.highlight && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="success" size="sm" className="animate-pulse">
                      New
                    </Badge>
                  </div>
                )}

                <div className="relative space-y-4">
                  {/* Icon and Badge */}
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${feature.iconBg} flex items-center justify-center
                      group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <Icon className={`w-6 h-6 sm:w-7 sm:h-7 ${feature.iconColor}`} />
                    </div>
                    <Badge variant="outline" size="sm" className="text-xs">
                      {feature.badge}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <h3 className="text-lg sm:text-xl font-bold font-display text-white group-hover:text-primary-300 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm sm:text-base text-neutral-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  {/* Hover indicator */}
                  <div className="flex items-center gap-2 text-sm text-primary-400 opacity-0 group-hover:opacity-100 
                    transition-opacity duration-300">
                    <span>Learn more</span>
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" 
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
          <p className="text-neutral-400 mb-4">
            Ready to transform your newsletter workflow?
          </p>
          <button 
            onClick={() => document.querySelector('header')?.scrollIntoView({ behavior: 'smooth' })}
            className="text-primary-400 hover:text-primary-300 font-semibold inline-flex items-center gap-2 
              transition-colors group"
          >
            Start your free trial
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" 
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </Container>
    </section>
  );
};

export default Features;