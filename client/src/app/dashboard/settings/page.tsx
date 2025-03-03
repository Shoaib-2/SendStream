// src/app/dashboard/settings/page.tsx
"use client";
import { useState, useEffect } from 'react';
import { Save, RefreshCw, ArrowDownToLine, ToggleLeft, ToggleRight } from 'lucide-react';
import { settingsAPI } from '@/services/api';
import { useData } from '@/context/dataContext';

interface Settings {
  email: {
    fromName: string;
    replyTo: string;
    senderEmail: string;
  };
  mailchimp: {
    apiKey: string;
    serverPrefix: string;
    enabled: boolean;
    autoSync: boolean;
  };
}

export default function SettingsPage() {
  const { addSubscriber } = useData();
  const [settings, setSettings] = useState<Settings>({
    email: { 
      fromName: '', 
      replyTo: '', 
      senderEmail: '' 
    },
    mailchimp: { 
      apiKey: '', 
      serverPrefix: '', 
      enabled: false, 
      autoSync: false 
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [connectionStatus, setConnectionStatus] = useState({ 
    mailchimp: { connected: false, message: '', listId: '' } 
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsAPI.getSettings();
      setSettings(data);
      if (data.mailchimp?.enabled) {
        setConnectionStatus(prev => ({
          ...prev,
          mailchimp: { ...prev.mailchimp, connected: true }
        }));
      }
    } catch (error) {
      showMessage('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedSettings = await settingsAPI.updateSettings(settings);
      setSettings(updatedSettings);
      showMessage('Settings saved successfully', 'success');
    } catch (error) {
      showMessage('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const testIntegration = async (type: 'mailchimp') => {
    try {
      setTesting(true);
      setConnectionStatus(prev => ({
        ...prev,
        [type]: { ...prev[type], message: 'Testing connection...' }
      }));
      
      const result = await settingsAPI.testIntegration(type);
      
      if (result) {
        const success = result.success === undefined ? false : result.success;
        const message = result.message || 'Connection test completed';
        
        setConnectionStatus(prev => ({
          ...prev,
          [type]: { 
            connected: success, 
            message: message,
            listId: result.listId || ''
          }
        }));
        
        showMessage(message, success ? 'success' : 'error');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      setConnectionStatus(prev => ({
        ...prev,
        [type]: { ...prev[type], connected: false, message: 'Connection failed' }
      }));
      showMessage(`Failed to test ${type} integration`, 'error');
    } finally {
      setTesting(false);
    }
  };

  const toggleIntegration = async (type: 'mailchimp', enabled: boolean) => {
    try {
      await settingsAPI.enableIntegration(type, enabled);
      
      setSettings(prev => ({
        ...prev,
        [type]: { ...prev[type], enabled }
      }));
      
      setConnectionStatus(prev => ({
        ...prev,
        [type]: { ...prev[type], connected: enabled }
      }));
      
      showMessage(`Mailchimp integration ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      showMessage(`Failed to ${enabled ? 'enable' : 'disable'} integration`, 'error');
    }
  };

  const toggleAutoSync = async (enabled: boolean) => {
    try {
      await settingsAPI.enableIntegration('mailchimp', settings.mailchimp.enabled, enabled);
      
      setSettings(prev => ({
        ...prev,
        mailchimp: { ...prev.mailchimp, autoSync: enabled }
      }));
      
      showMessage(`Auto-sync ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      showMessage(`Failed to ${enabled ? 'enable' : 'disable'} auto-sync`, 'error');
    }
  };

  const syncSubscribers = async () => {
    setSyncing(true);
    try {
      const result = await settingsAPI.syncSubscribers();
      if (result && Array.isArray(result)) {
        // Add each subscriber to the system
        let addedCount = 0;
        for (const subscriber of result) {
          try {
            await addSubscriber({
              email: subscriber.email,
              name: subscriber.name,
              status: subscriber.status,
              subscribed: subscriber.subscribedDate
            });
            addedCount++;
          } catch (error) {
            console.error('Error adding subscriber:', error);
          }
        }
        showMessage(`Successfully imported ${addedCount} subscribers from Mailchimp`, 'success');
      }
    } catch (error) {
      showMessage('Failed to sync subscribers from Mailchimp', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const showMessage = (text: string, type: string) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  // Handle input type for masked fields
  const isApiKeyMasked = settings.mailchimp.apiKey.includes('••••');

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
                  onChange={(e) => setSettings({
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
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, replyTo: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Sender Email</label>
                <input
                  type="email"
                  value={settings.email.senderEmail}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, senderEmail: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  placeholder="sender@yourdomain.com"
                />
                <p className="text-xs text-gray-400 mt-1">
                  This email will be used as the sender address for your newsletters
                </p>
              </div>
            </div>
          </section>

          <section className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl
            border border-gray-800 hover:border-blue-500/50 transition-all duration-300">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl font-semibold font-inter">Mailchimp</h2>
                {connectionStatus.mailchimp.connected && (
                  <span className="text-sm text-green-400">Connected</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => testIntegration('mailchimp')}
                  disabled={testing || !settings.mailchimp.apiKey || !settings.mailchimp.serverPrefix}
                  className="bg-gray-700/50 hover:bg-gray-600/50 px-4 py-2 rounded-lg
                    flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                    border border-gray-600 hover:border-blue-500/50 transition-all duration-300"
                >
                  <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                
                {connectionStatus.mailchimp.connected && (
                  <button
                    onClick={syncSubscribers}
                    disabled={syncing}
                    className="bg-green-500/20 hover:bg-green-500/30 px-4 py-2 rounded-lg
                      flex items-center gap-2 text-green-400 border border-green-500/30
                      hover:border-green-500/50 transition-all duration-300"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    {syncing ? 'Importing...' : 'Import Subscribers'}
                  </button>
                )}
              </div>
            </div>
            
            {connectionStatus.mailchimp.message && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                connectionStatus.mailchimp.connected
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-blue-500/10 text-blue-400'
              }`}>
                {connectionStatus.mailchimp.message}
              </div>
            )}
            
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">API Key</label>
                <input
                  type="password"
                  value={settings.mailchimp.apiKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    mailchimp: { ...settings.mailchimp, apiKey: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  placeholder="Enter your Mailchimp API key"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Find your API key in your Mailchimp account under Account → Extras → API Keys
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Server Prefix</label>
                <input
                  type="text"
                  value={settings.mailchimp.serverPrefix}
                  onChange={(e) => setSettings({
                    ...settings,
                    mailchimp: { ...settings.mailchimp, serverPrefix: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                  placeholder="e.g., us1, us2"
                />
                <p className="text-xs text-gray-400 mt-1">
                  This is part of your Mailchimp URL: https://<strong>us1</strong>.admin.mailchimp.com
                </p>
              </div>
            </div>
            
            {/* Only show these controls after successful connection test */}
            {connectionStatus.mailchimp.connected && (
              <div className="mt-6 space-y-4 border-t border-gray-700 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Enable Mailchimp Integration</h3>
                    <p className="text-sm text-gray-400">Connect your newsletter with Mailchimp</p>
                  </div>
                  <button 
                    onClick={() => toggleIntegration('mailchimp', !settings.mailchimp.enabled)}
                    className="text-gray-300 hover:text-blue-400"
                  >
                    {settings.mailchimp.enabled ? (
                      <ToggleRight className="w-10 h-10 text-blue-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10" />
                    )}
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Auto-Sync on Login</h3>
                    <p className="text-sm text-gray-400">Automatically sync with Mailchimp when loading subscribers</p>
                  </div>
                  <button 
                    onClick={() => toggleAutoSync(!settings.mailchimp.autoSync)}
                    className="text-gray-300 hover:text-blue-400"
                    disabled={!settings.mailchimp.enabled}
                  >
                    {settings.mailchimp.autoSync ? (
                      <ToggleRight className="w-10 h-10 text-blue-500" />
                    ) : (
                      <ToggleLeft className="w-10 h-10" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}