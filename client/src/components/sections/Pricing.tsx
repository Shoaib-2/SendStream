// src/components/sections/Pricing.tsx
import React from 'react';
import { Check } from 'lucide-react';
import Button from '../UI/Button';
import { PricingTier } from '@/types';

const pricingTiers: PricingTier[] = [
  {
    name: "Basic",
    price: "$9",
    period: "/month",
    features: ["Up to 1,000 subscribers", "2 newsletters/month", "Basic analytics"],
    cta: "Start Free Trial"
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    features: ["Up to 10,000 subscribers", "Unlimited newsletters", "Advanced analytics", "Priority support"],
    cta: "Get Started"
  }
];

const Pricing = () => {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-center mb-12">
        Simple, Transparent Pricing
      </h2>
      <div className="grid md:grid-cols-2 gap-8">
        {pricingTiers.map((tier, index) => (
          <div 
            key={index} 
            className="bg-gray-800 p-6 rounded-lg text-center transform hover:scale-105 transition-transform duration-200 flex flex-col"
          >
            <h3 className="text-xl font-semibold mb-4">{tier.name}</h3>
            <div className="mb-6">
              <span className="text-4xl font-bold">{tier.price}</span>
              <span className="text-gray-400">{tier.period}</span>
            </div>
            <ul className="mb-8 space-y-4">
              {tier.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <Check className="w-5 h-5 text-blue-500 mr-2" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button className="w-full">{tier.cta}</Button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Pricing;