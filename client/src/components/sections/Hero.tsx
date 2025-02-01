// src/components/sections/Hero.tsx
import React from 'react';
import Button from '../UI/Button';


const Hero = () => {
  return (
    <header className="max-w-6xl mx-auto px-4 py-24">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-6">
          Simplify Your Newsletter Workflow
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Automate your newsletters with ease. Connect with Mailchimp or Substack 
          and scale effortlessly.
        </p>
        <Button>Start Free</Button>
      </div>
    </header>
  );
};

export default Hero;