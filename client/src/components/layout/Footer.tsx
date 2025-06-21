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
          <p>&copy; {currentYear} SendStream. All rights reserved. Developed By Mohammed Shoaib</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;