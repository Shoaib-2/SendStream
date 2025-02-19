// src/app/dashboard/settings/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { settingsAPI } from '@/services/api';

interface Settings {
  email: {
    fromName: string;
    replyTo: string;
  };
  mailchimp: {
    apiKey: string;
    serverPrefix: string;
    enabled: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    email: { fromName: '', replyTo: '' },
    mailchimp: { apiKey: '', serverPrefix: '', enabled: false },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsAPI.getSettings();
      setSettings(data);
    } catch (error) {
      showMessage('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateSettings(settings);
      showMessage('Settings saved successfully', 'success');
    } catch (error) {
      showMessage('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const testIntegration = async (type: 'mailchimp') => {
    try {
      const result = await settingsAPI.testIntegration(type);
      showMessage(result.message, result.success ? 'success' : 'error');
    } catch (error) {
      showMessage(`Failed to test ${type} integration`, 'error');
    }
  };

  const showMessage = (text: string, type: string) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="w-16 h-16 relative">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          </div>
        </div>
    );
  }

  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-inter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Integration Settings
          </h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-medium
              transform transition-all duration-300 hover:scale-105 disabled:opacity-50
              disabled:hover:scale-100 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl backdrop-blur-sm ${
            message.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/50 text-green-500' 
              : 'bg-red-500/10 border border-red-500/50 text-red-500'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <section className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl
            border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
            <h2 className="text-xl font-semibold font-inter mb-6">Email Configuration</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">From Name</label>
                <input
                  type="text"
                  value={settings.email.fromName}
                  onChange={e => setSettings({
                    ...settings,
                    email: { ...settings.email, fromName: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  placeholder="Newsletter Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Reply-To Email</label>
                <input
                  type="email"
                  value={settings.email.replyTo}
                  onChange={e => setSettings({
                    ...settings,
                    email: { ...settings.email, replyTo: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  placeholder="your@email.com"
                />
              </div>
            </div>
          </section>

          <section className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl
            border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold font-inter">Mailchimp</h2>
              <button
                onClick={() => testIntegration('mailchimp')}
                disabled={!settings.mailchimp.apiKey}
                className="bg-gray-700/50 hover:bg-gray-600/50 px-4 py-2 rounded-lg
                  flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                  border border-gray-600 hover:border-blue-500/50 transition-all duration-300"
              >
                <RefreshCw className="w-4 h-4" />
                Test Connection
              </button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">API Key</label>
                <input
                  type="password"
                  value={settings.mailchimp.apiKey}
                  onChange={e => setSettings({
                    ...settings,
                    mailchimp: { 
                      ...settings.mailchimp, 
                      apiKey: e.target.value,
                      enabled: !!e.target.value 
                    }
                  })}
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  placeholder="Enter your Mailchimp API key"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Server Prefix</label>
                <input
                  type="text"
                  value={settings.mailchimp.serverPrefix}
                  onChange={e => setSettings({
                    ...settings,
                    mailchimp: { ...settings.mailchimp, serverPrefix: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  placeholder="e.g., us1, us2"
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

