// src/components/layout/Footer.tsx
import React from 'react';

/**
 * Interface for footer link sections
 */
// interface FooterSection {
//   title: string;
//   links: {
//     name: string;
//     href: string;
//   }[];
// }

/**
 * Footer navigation data
 * Organized by sections for easy maintenance and scalability
 */
// const footerSections: FooterSection[] = [
//   {
//     title: "Company",
//     links: [
//       { name: "About", href: "/about" },
//       { name: "Contact", href: "/contact" }
//     ]
//   },
//   {
//     title: "Legal",
//     links: [
//       { name: "Terms", href: "/terms" },
//       { name: "Privacy", href: "/privacy" }
//     ]
//   },
//   {
//     title: "Resources",
//     links: [
//       { name: "Blog", href: "/blog" },
//       { name: "Documentation", href: "/docs" }
//     ]
//   }
// ];

/**
 * Footer component containing navigation links and copyright information
 * Implements a responsive grid layout
 */
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-800 mt-16 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Footer navigation grid
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-8">
          {footerSections.map((section, index) => (
            <div key={index}>
              <h4 className="font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2 text-gray-400">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a 
                      href={link.href}
                      className="hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div> */}

        {/* Copyright section */}
        <div className="pt-8 mt-8 border-t border-gray-700 text-gray-400 text-center">
          <p>&copy; {currentYear} SendStream. All rights reserved. Developed By Mohammed Shoaib.</p>
          <p className="mt-2 text-sm text-gray-400">If you have any issues, DM me on LinkedIn.</p>
          <p className="mt-2">
            <a
              href="https://www.linkedin.com/in/mohammed-shoaib-dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24" className="inline-block align-text-bottom"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm15.5 11.268h-3v-5.604c0-1.337-.025-3.063-1.868-3.063-1.868 0-2.154 1.459-2.154 2.968v5.699h-3v-10h2.881v1.367h.041c.401-.761 1.379-1.563 2.838-1.563 3.036 0 3.6 2 3.6 4.59v5.606z"/></svg>
              Connect on LinkedIn
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;