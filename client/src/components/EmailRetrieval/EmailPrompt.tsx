// 'use client'
// import React, { useState, useEffect } from 'react';

// declare global {
//     interface Window {
//       checkoutEmail?: string;
//       getUserEmail?: () => string;
//     }
//   }
  
// interface EmailPromptProps {
//   isRenewal?: boolean;
// }

// const EmailPrompt: React.FC<EmailPromptProps> = ({ isRenewal = false }) => {
//   const [email, setEmail] = useState('');
//   const [showPrompt, setShowPrompt] = useState(false);
  
//   useEffect(() => {
//     // Check if we need to prompt for email
//     const checkEmail = () => {
//       // Try to get email from all sources
//       const storedEmail = localStorage.getItem('checkout_email') || 
//                          localStorage.getItem('user_email') || 
//                          '';
      
//       // Also try from user object
//       let userEmail = '';
//       try {
//         const userJson = localStorage.getItem('user');
//         if (userJson) {
//           const user = JSON.parse(userJson);
//           if (user && user.email) {
//             userEmail = user.email;
//           }
//         }
//       } catch (e) {
//         console.error('Error parsing user JSON:', e);
//       }
      
//       const finalEmail = storedEmail || userEmail || window.checkoutEmail || '';
      
//       // Only show prompt if no email found
//       if (!finalEmail) {
//         console.log('No email found in any source, showing prompt');
//         setShowPrompt(true);
//       } else {
//         setEmail(finalEmail);
//         console.log('Found email, storing for checkout:', finalEmail);
//         localStorage.setItem('checkout_email', finalEmail);
//         if (typeof window !== 'undefined') {
//           window.checkoutEmail = finalEmail;
//         }
//       }
//     };
    
//     // Check on component mount
//     checkEmail();
//   }, []);
  
//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
    
//     if (email && email.includes('@')) {
//       // Store email for checkout
//       localStorage.setItem('checkout_email', email);
//       localStorage.setItem('user_email', email);
      
//       // Set global variable
//       if (typeof window !== 'undefined') {
//         window.checkoutEmail = email;
//       }
      
//       console.log('Email saved from prompt:', email);
//       setShowPrompt(false);
//     }
//   };
  
//   if (!showPrompt) return null;
  
//   return (
//     <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
//       <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
//         <h3 className="text-xl font-bold mb-4">
//           {isRenewal ? 'Confirm Your Email' : 'Start Your Free Trial'}
//         </h3>
//         <p className="text-gray-300 mb-4">
//           {isRenewal 
//             ? 'Please enter your email to renew your subscription.' 
//             : 'Please enter your email to start your free trial.'}
//         </p>
        
//         <form onSubmit={handleSubmit}>
//           <input
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             placeholder="Your email address"
//             className="w-full p-3 rounded bg-gray-700 text-white mb-4"
//             required
//           />
          
//           <div className="flex justify-end">
//             <button
//               type="submit"
//               className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
//             >
//               {isRenewal ? 'Continue' : 'Start Trial'}
//             </button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default EmailPrompt;