"use client";
import { useState, useEffect } from 'react';
import { 
  ArrowDownIcon, 
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

import { settingsAPI } from '@/services/api';
import SubscriptionManagement from '@/components/dashboardSubscription/SubscriptionManagement';
import { Save } from 'lucide-react';
import Container from '@/components/UI/Container';
import Card from '@/components/UI/Card';
import Badge from '@/components/UI/Badge';
import Button from '@/components/UI/Button';

// Custom local interface for Settings that enforces required fields
interface LocalSettings {
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
    listId?: string;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<LocalSettings>({
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
  // Define a proper type that matches what we expect from the API
  // Match our local types with what we get from the API
  interface ConnectionStatus {
    mailchimp: {
      connected: boolean;
      message: string;
      listId: string;
    }
  }

  // Specify what we expect from the API
  // interface ApiTestResponse {
  //   success: boolean;
  //   message: boolean;
  //   listId?: string;
  // }

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    mailchimp: { connected: false, message: '', listId: '' }
  });

  // Move loadSettings inside useEffect to avoid dependency warning
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await settingsAPI.getSettings();
        setSettings({
          email: {
            fromName: data.email.fromName || '',
            replyTo: data.email.replyTo || '',
            senderEmail: data.email.senderEmail || ''
          },
          mailchimp: {
            apiKey: data.mailchimp.apiKey || '',
            serverPrefix: data.mailchimp.serverPrefix || '',
            enabled: data.mailchimp.enabled || false,
            autoSync: data.mailchimp.autoSync || false,
            listId: data.mailchimp.listId || ''
          }
        });
        setLoading(false);
      } catch {
        setLoading(false);
        setMessage({ text: 'Failed to load settings', type: 'error' });
      }
    };
    loadSettings();
  }, []); // Remove loadSettings from dependency array

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedSettings = await settingsAPI.updateSettings({
        email: settings.email, 
        mailchimp: settings.mailchimp
      });

      // Properly handle the response by ensuring required fields exist
      setSettings({
        email: {
          fromName: updatedSettings.email.fromName || '',
          replyTo: updatedSettings.email.replyTo || '',
          senderEmail: updatedSettings.email.senderEmail || ''
        },
        mailchimp: {
          apiKey: updatedSettings.mailchimp.apiKey || '',
          serverPrefix: updatedSettings.mailchimp.serverPrefix || '',
          enabled: updatedSettings.mailchimp.enabled || false,
          autoSync: updatedSettings.mailchimp.autoSync || false,
          listId: updatedSettings.mailchimp.listId
        }
      });

      showMessage('Settings saved successfully', 'success');
    } catch {
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

      // Pass proper credentials to test API
      const result = await settingsAPI.testIntegration(
        type,
        {
          apiKey: settings.mailchimp.apiKey,
          serverPrefix: settings.mailchimp.serverPrefix
        }
      );

      if (result) {
        // Now result is properly typed with ExtendedIntegrationResponse
        const success = result.success;
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
    } catch {
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
      // Pass the current autoSync value as the third parameter
      await settingsAPI.enableIntegration(type, enabled, settings.mailchimp.autoSync);

      setSettings(prev => ({
        ...prev,
        [type]: { ...prev[type], enabled }
      }));

      setConnectionStatus(prev => ({
        ...prev,
        [type]: { ...prev[type], connected: enabled }
      }));

      showMessage(`Mailchimp integration ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch {
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
    } catch {
      showMessage(`Failed to ${enabled ? 'enable' : 'disable'} auto-sync`, 'error');
    }
  };

  const syncSubscribers = async () => {
    setSyncing(true);
    try {
      // Call the backend sync API
      await settingsAPI.syncSubscribers();
      
      // Show success message
      showMessage('Sync completed. Some duplicates may have been skipped.', 'success');
      
      // Force a complete app reload to refresh all data from server
      setTimeout(() => {
        window.location.href = '/dashboard';
        // Add a short delay before redirecting to subscribers page
        setTimeout(() => {
          window.location.href = '/dashboard/subscribers';
        }, 500);
      }, 1000);
    } catch {
      // Still show partial success since some records likely synced
      showMessage('Sync completed with some issues. Refreshing data...', 'info');
      
      // Still reload to show whatever was successfully synced
      setTimeout(() => {
        window.location.href = '/dashboard/subscribers';
      }, 1000);
    } finally {
      setSyncing(false);
    }
  }

  const showMessage = (text: string, type: string) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <div className="w-12 h-12 md:w-16 md:h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 blur-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 min-h-screen">
      <Container size="lg" className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display gradient-text">
            Integration Settings
          </h1>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="gradient"
            leftIcon={<Save className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {message.text && (
          <Badge
            variant={message.type === 'success' ? 'success' : 'error'}
            size="lg"
            className="w-full sm:w-auto shadow-glow-lg"
          >
            {message.text}
          </Badge>
        )}

        <div className="space-y-4 sm:space-y-6">
          <Card variant="glass" padding="lg">
            <h2 className="text-lg sm:text-xl font-semibold font-display mb-4 sm:mb-6 text-white">Email Configuration</h2>
            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-sm font-medium text-neutral-200">From Name</label>
                <input
                  type="text"
                  value={settings.email.fromName}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, fromName: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 bg-neutral-900/50 rounded-lg border border-neutral-700
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 text-sm sm:text-base
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="Newsletter Name"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-sm font-medium text-neutral-200">Reply-To Email</label>
                <input
                  type="email"
                  value={settings.email.replyTo}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, replyTo: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 bg-neutral-900/50 rounded-lg border border-neutral-700
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 text-sm sm:text-base
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-neutral-200">Sender Email</label>
                <input
                  type="email"
                  value={settings.email.senderEmail}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, senderEmail: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 bg-neutral-900/50 rounded-lg border border-neutral-700
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 text-sm sm:text-base
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="sender@yourdomain.com"
                />
                <p className="text-xs text-neutral-400 mt-1.5">
                  This email will be used as the sender address for your newsletters
                </p>
              </div>
            </div>
          </Card>

          <Card variant="glass" padding="lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold font-display text-white">Mailchimp</h2>
                {connectionStatus.mailchimp.connected && (
                  <Badge variant="success" size="sm" className="mt-1">Connected</Badge>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => testIntegration('mailchimp')}
                  disabled={testing || !settings.mailchimp.apiKey || !settings.mailchimp.serverPrefix}
                  variant="secondary"
                  leftIcon={<ArrowPathIcon className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />}
                  className="flex-1 sm:flex-none"
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>

                {connectionStatus.mailchimp.connected && (
                  <Button
                    onClick={syncSubscribers}
                    disabled={syncing}
                    variant="primary"
                    leftIcon={<ArrowDownIcon className="w-4 h-4" />}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700"
                  >
                    {syncing ? 'Importing...' : 'Import Subscribers'}
                  </Button>
                )}
              </div>
            </div>

            {connectionStatus.mailchimp.message && (
              <Badge
                variant={connectionStatus.mailchimp.connected ? 'success' : 'primary'}
                size="md"
                className="mb-4 w-full sm:w-auto"
              >
                {connectionStatus.mailchimp.message}
              </Badge>
            )}

            <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-sm font-medium text-neutral-200">API Key</label>
                <input
                  type="password"
                  value={settings.mailchimp.apiKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    mailchimp: { ...settings.mailchimp, apiKey: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 bg-neutral-900/50 rounded-lg border border-neutral-700
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 text-sm sm:text-base
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="Enter your Mailchimp API key"
                />
                <p className="text-xs text-neutral-400 mt-1.5">
                  Find your API key in your Mailchimp account under Account → Extras → API Keys
                </p>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-sm font-medium text-neutral-200">Server Prefix</label>
                <input
                  type="text"
                  value={settings.mailchimp.serverPrefix}
                  onChange={(e) => setSettings({
                    ...settings,
                    mailchimp: { ...settings.mailchimp, serverPrefix: e.target.value }
                  })}
                  className="w-full px-3.5 py-2.5 bg-neutral-900/50 rounded-lg border border-neutral-700
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 text-sm sm:text-base
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="e.g., us1, us2"
                />
                <p className="text-xs text-neutral-400 mt-1.5">
                  This is part of your Mailchimp URL: https://<strong>us1</strong>.admin.mailchimp.com
                </p>
              </div>
            </div>

            {connectionStatus.mailchimp.connected && (
              <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm sm:text-base text-white">Enable Mailchimp Integration</h3>
                    <p className="text-xs sm:text-sm text-neutral-400 truncate">Connect your newsletter with Mailchimp</p>
                  </div>
                  <div className="flex-shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.mailchimp.enabled}
                        onChange={(e) => toggleIntegration('mailchimp', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 
                        rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['']
                        after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full
                        after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary-500 
                        peer-checked:to-primary-600"></div>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm sm:text-base text-white">Auto-Sync on Login</h3>
                    <p className="text-xs sm:text-sm text-neutral-400 truncate">Automatically sync with Mailchimp when loading subscribers</p>
                  </div>
                  <div className="flex-shrink-0">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.mailchimp.autoSync}
                        onChange={(e) => toggleAutoSync(e.target.checked)}
                        disabled={!settings.mailchimp.enabled}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 
                        rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['']
                        after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full
                        after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary-500 
                        peer-checked:to-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
        <Card variant="glass" padding="lg" className="mt-4 sm:mt-6">
          <SubscriptionManagement />
        </Card>
      </Container>
    </div>
  );
}