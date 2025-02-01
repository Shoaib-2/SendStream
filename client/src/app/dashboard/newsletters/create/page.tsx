// src/app/dashboard/newsletters/create/page.tsx
"use client";
import React, { useState } from 'react';
import { Save, Calendar, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NewsletterData {
 title: string;
 subject: string;
 content: string;
 scheduledDate?: string;
 status: 'draft' | 'scheduled' | 'sent';
}

const CreateNewsletter = () => {
 const router = useRouter();
 const [newsletter, setNewsletter] = useState<NewsletterData>({
   title: '',
   subject: '',
   content: '',
   status: 'draft'
 });
 const [showScheduler, setShowScheduler] = useState(false);

 const saveDraft = async () => {
   try {
     // Save to local storage for now
     const drafts = JSON.parse(localStorage.getItem('newsletterDrafts') || '[]');
     drafts.push({ ...newsletter, id: Date.now() });
     localStorage.setItem('newsletterDrafts', JSON.stringify(drafts));
     router.push('/dashboard/newsletters');
   } catch (error) {
     console.error('Error saving draft:', error);
   }
 };

 const scheduleNewsletter = async (date: string) => {
   try {
     const scheduled = { 
       ...newsletter, 
       scheduledDate: date, 
       status: 'scheduled' as const 
     };
     const newsletters = JSON.parse(localStorage.getItem('newsletters') || '[]');
     newsletters.push({ ...scheduled, id: Date.now() });
     localStorage.setItem('newsletters', JSON.stringify(newsletters));
     router.push('/dashboard/newsletters');
   } catch (error) {
     console.error('Error scheduling:', error);
   }
 };

 const sendNow = async () => {
   try {
     const newNewsletter = { 
       ...newsletter, 
       status: 'sent' as const,
       sentDate: new Date().toISOString()
     };
     const newsletters = JSON.parse(localStorage.getItem('newsletters') || '[]');
     newsletters.push({ ...newNewsletter, id: Date.now() });
     localStorage.setItem('newsletters', JSON.stringify(newsletters));
     router.push('/dashboard/newsletters');
   } catch (error) {
     console.error('Error sending:', error);
   }
 };

 return (
   <div className="p-6 max-w-4xl mx-auto">
     <div className="flex justify-between items-center mb-8">
       <h1 className="text-2xl font-bold">Create Newsletter</h1>
       <div className="flex gap-4">
         <button 
           onClick={saveDraft}
           className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
         >
           <Save className="w-4 h-4" />
           Save Draft
         </button>
         {!showScheduler ? (
           <button 
             onClick={() => setShowScheduler(true)}
             className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
           >
             <Calendar className="w-4 h-4" />
             Schedule
           </button>
         ) : (
           <div className="flex items-center gap-2">
             <input
               type="datetime-local"
               className="px-4 py-2 bg-gray-700 rounded-lg"
               onChange={(e) => scheduleNewsletter(e.target.value)}
             />
             <button 
               onClick={() => setShowScheduler(false)}
               className="text-gray-400 hover:text-white"
             >
               Cancel
             </button>
           </div>
         )}
         <button 
           onClick={sendNow}
           className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg"
         >
           <Send className="w-4 h-4" />
           Send Now
         </button>
       </div>
     </div>

     <div className="space-y-6">
       <div>
         <label className="block text-sm font-medium mb-2">Newsletter Title</label>
         <input
           type="text"
           value={newsletter.title}
           onChange={(e) => setNewsletter({...newsletter, title: e.target.value})}
           className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
           placeholder="Newsletter Title"
         />
       </div>

       <div>
         <label className="block text-sm font-medium mb-2">Email Subject</label>
         <input
           type="text"
           value={newsletter.subject}
           onChange={(e) => setNewsletter({...newsletter, subject: e.target.value})}
           className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
           placeholder="Email Subject"
         />
       </div>

       <div>
         <label className="block text-sm font-medium mb-2">Content</label>
         <textarea
           value={newsletter.content}
           onChange={(e) => setNewsletter({...newsletter, content: e.target.value})}
           className="w-full h-96 px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
           placeholder="Write your newsletter content here..."
         />
       </div>
     </div>
   </div>
 );
};

export default CreateNewsletter;