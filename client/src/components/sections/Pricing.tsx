import React from 'react';
import { Check, Zap } from 'lucide-react';
import Button from '../UI/Button';

const pricingTier = {
  name: "Pro",
  price: "$29",
  period: "/month",
  description: "Everything you need to create and grow your newsletter",
  features: [
    "Unlimited subscribers",
    "Advanced analytics",
    "Priority support",
    "API access",
    "Custom integrations",
  ],
  cta: "Start Free Trial"
};

const Pricing = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-500/5" />
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold font-inter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Simple Pricing
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees. Cancel anytime.
          </p>
        </div>

        <div className="max-w-lg mx-auto">
          <div className="relative p-8 rounded-2xl flex flex-col h-full
            backdrop-blur-sm border transition-all duration-300
            bg-blue-500/10 border-blue-500/50 hover:border-blue-500">
            
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 
              bg-blue-500 text-white px-4 py-1 rounded-full 
              flex items-center gap-2 font-medium">
              <Zap className="w-4 h-4" />
              14-day free trial
            </div>

            <div className="mb-8 text-center">
              <h3 className="text-2xl font-bold mb-2 font-inter">{pricingTier.name}</h3>
              <p className="text-gray-400 mb-4">{pricingTier.description}</p>
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold">{pricingTier.price}</span>
                <span className="text-gray-400">{pricingTier.period}</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {pricingTier.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 mt-1 flex-shrink-0 text-blue-400" />
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>

            <Button className="w-full">
              {pricingTier.cta}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;