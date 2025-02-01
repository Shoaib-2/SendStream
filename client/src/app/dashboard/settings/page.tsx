// src/app/dashboard/settings/page.tsx
"use client";
import { useState } from 'react';
import { Save, Mail, Key } from 'lucide-react';

interface Settings {
 mailchimp: {
   apiKey: string;
   serverPrefix: string;
 };
 substack: {
   apiKey: string;
   publication: string;
 };
 email: {
   fromName: string;
   replyTo: string;
 };
}

export default function SettingsPage() {
 const [settings, setSettings] = useState<Settings>({
   mailchimp: {
     apiKey: '',
     serverPrefix: ''
   },
   substack: {
     apiKey: '',
     publication: ''
   },
   email: {
     fromName: '',
     replyTo: ''
   }
 });

 const [saving, setSaving] = useState(false);

 const handleSave = async () => {
   setSaving(true);
   try {
     await new Promise(resolve => setTimeout(resolve, 1000));
     localStorage.setItem('newsletter-settings', JSON.stringify(settings));
   } finally {
     setSaving(false);
   }
 };

 return (
   <div className="p-6">
     <div className="flex justify-between items-center mb-8">
       <h1 className="text-2xl font-bold">Settings</h1>
       <button
         onClick={handleSave}
         disabled={saving}
         className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg flex items-center gap-2"
       >
         <Save className="w-4 h-4" />
         {saving ? 'Saving...' : 'Save Changes'}
       </button>
     </div>

     <div className="space-y-8">
       <section className="bg-gray-800 p-6 rounded-xl">
         <h2 className="text-xl font-semibold mb-6">Mailchimp Integration</h2>
         <div className="space-y-4">
           <div>
             <label className="block text-sm mb-2">API Key</label>
             <input
               type="password"
               value={settings.mailchimp.apiKey}
               onChange={e => setSettings({
                 ...settings,
                 mailchimp: { ...settings.mailchimp, apiKey: e.target.value }
               })}
               className="w-full px-4 py-2 bg-gray-700 rounded-lg"
             />
           </div>
           <div>
             <label className="block text-sm mb-2">Server Prefix</label>
             <input
               type="text"
               value={settings.mailchimp.serverPrefix}
               onChange={e => setSettings({
                 ...settings,
                 mailchimp: { ...settings.mailchimp, serverPrefix: e.target.value }
               })}
               className="w-full px-4 py-2 bg-gray-700 rounded-lg"
             />
           </div>
         </div>
       </section>

       <section className="bg-gray-800 p-6 rounded-xl">
         <h2 className="text-xl font-semibold mb-6">Substack Integration</h2>
         <div className="space-y-4">
           <div>
             <label className="block text-sm mb-2">API Key</label>
             <input
               type="password"
               value={settings.substack.apiKey}
               onChange={e => setSettings({
                 ...settings,
                 substack: { ...settings.substack, apiKey: e.target.value }
               })}
               className="w-full px-4 py-2 bg-gray-700 rounded-lg"
             />
           </div>
           <div>
             <label className="block text-sm mb-2">Publication Name</label>
             <input
               type="text"
               value={settings.substack.publication}
               onChange={e => setSettings({
                 ...settings,
                 substack: { ...settings.substack, publication: e.target.value }
               })}
               className="w-full px-4 py-2 bg-gray-700 rounded-lg"
             />
           </div>
         </div>
       </section>

       <section className="bg-gray-800 p-6 rounded-xl">
         <h2 className="text-xl font-semibold mb-6">Email Settings</h2>
         <div className="space-y-4">
           <div>
             <label className="block text-sm mb-2">"From" Name</label>
             <input
               type="text"
               value={settings.email.fromName}
               onChange={e => setSettings({
                 ...settings,
                 email: { ...settings.email, fromName: e.target.value }
               })}
               className="w-full px-4 py-2 bg-gray-700 rounded-lg"
             />
           </div>
           <div>
             <label className="block text-sm mb-2">Reply-To Email</label>
             <input
               type="email"
               value={settings.email.replyTo}
               onChange={e => setSettings({
                 ...settings,
                 email: { ...settings.email, replyTo: e.target.value }
               })}
               className="w-full px-4 py-2 bg-gray-700 rounded-lg"
             />
           </div>
         </div>
       </section>
     </div>
   </div>
 );
}