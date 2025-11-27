'use client';

import React from 'react';
import Container from '../UI/Container';
import { Send, Github, Twitter, Linkedin, Mail, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative mt-20 bg-gradient-to-b from-neutral-950 to-neutral-950 border-t border-white/10 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 mesh-gradient-dark opacity-20" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-500/50 to-transparent" />
      
      <Container size="xl" className="relative z-10 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl blur-md opacity-50" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
              </div>
              <span className="text-lg sm:text-xl font-bold font-display gradient-text">SendStream</span>
            </div>
            <p className="text-neutral-400 text-sm leading-relaxed">
              AI-powered newsletter automation platform for modern creators. Create, schedule, and grow with ease.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold font-display text-white mb-4">Product</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <button
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-neutral-400 hover:text-primary-400 transition-colors"
                >
                  Features
                </button>
              </li>
              <li>
                <button
                  onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-neutral-400 hover:text-primary-400 transition-colors"
                >
                  Pricing
                </button>
              </li>
              <li>
                <a href="#" className="text-neutral-400 hover:text-primary-400 transition-colors">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-400 hover:text-primary-400 transition-colors">
                  API Reference
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold font-display text-white mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="text-neutral-400 hover:text-primary-400 transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-400 hover:text-primary-400 transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-400 hover:text-primary-400 transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-neutral-400 hover:text-primary-400 transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold font-display text-white mb-4">Get in Touch</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a 
                  href="https://www.linkedin.com/in/mohammed-shoaib-dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-neutral-400 hover:text-primary-400 transition-colors group"
                >
                  <Linkedin className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  LinkedIn
                </a>
              </li>
              <li>
                <a 
                  href="mailto:support@sendstream.com" 
                  className="flex items-center gap-2 text-neutral-400 hover:text-primary-400 transition-colors group"
                >
                  <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  support@sendstream.com
                </a>
              </li>
            </ul>
            <p className="text-xs text-neutral-500 mt-4 leading-relaxed">
              Have issues? DM me on LinkedIn for support.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 sm:pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-neutral-400 text-center md:text-left">
              &copy; {currentYear} SendStream. All rights reserved. Developed with{' '}
              <Heart className="w-3 h-3 inline text-accent-500 fill-current" /> by{' '}
              <a 
                href="https://www.linkedin.com/in/mohammed-shoaib-dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 font-medium transition-colors"
              >
                Shoaib Mohammed
              </a>
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <a
                href="https://www.linkedin.com/in/mohammed-shoaib-dev/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-neutral-800/50 hover:bg-primary-500/10 border border-neutral-700 hover:border-primary-500/50
                  flex items-center justify-center text-neutral-400 hover:text-primary-400 transition-all group"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-neutral-800/50 hover:bg-secondary-500/10 border border-neutral-700 hover:border-secondary-500/50
                  flex items-center justify-center text-neutral-400 hover:text-secondary-400 transition-all group"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-lg bg-neutral-800/50 hover:bg-accent-500/10 border border-neutral-700 hover:border-accent-500/50
                  flex items-center justify-center text-neutral-400 hover:text-accent-400 transition-all group"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;