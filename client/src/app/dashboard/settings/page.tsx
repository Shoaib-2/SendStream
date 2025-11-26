"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowDownIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';

import { settingsAPI } from '@/services/api';
import SubscriptionManagement from '@/components/dashboardSubscription/SubscriptionManagement';
import { Save, Mail, Settings, Zap, RefreshCw, Shield } from 'lucide-react';
import Container from '@/components/UI/Container';
import GlassCard from '@/components/UI/GlassCard';
import Badge from '@/components/UI/Badge';
import Button from '@/components/UI/Button';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" as const }
  }
};

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
  
  interface ConnectionStatus {
    mailchimp: {
      connected: boolean;
      message: string;
      listId: string;
    }
  }

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    mailchimp: { connected: false, message: '', listId: '' }
  });

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
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedSettings = await settingsAPI.updateSettings({
        email: settings.email, 
        mailchimp: settings.mailchimp
      });

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

      const result = await settingsAPI.testIntegration(
        type,
        {
          apiKey: settings.mailchimp.apiKey,
          serverPrefix: settings.mailchimp.serverPrefix
        }
      );

      if (result) {
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
      await settingsAPI.syncSubscribers();
      
      showMessage('Sync completed. Some duplicates may have been skipped.', 'success');
      
      setTimeout(() => {
        window.location.href = '/dashboard';
        setTimeout(() => {
          window.location.href = '/dashboard/subscribers';
        }, 500);
      }, 1000);
    } catch {
      showMessage('Sync completed with some issues. Refreshing data...', 'info');
      
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
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 blur-xl" />
        </div>
      </div>
    );
  }

  return (
    <Container size="lg" className="py-8 min-h-screen">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-display gradient-text mb-2">
              Settings
            </h1>
            <p className="text-neutral-400">Configure your email and integration settings</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="gradient"
            leftIcon={saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </motion.div>

        {/* Notification */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Badge
                variant={message.type === 'success' ? 'success' : message.type === 'info' ? 'primary' : 'error'}
                size="lg"
                className="w-full sm:w-auto shadow-glow-lg flex items-center gap-2"
              >
                {message.type === 'success' && <CheckCircleIcon className="w-4 h-4" />}
                {message.text}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Stats */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Mail, label: 'Email Provider', value: 'SendGrid', color: 'primary' },
            { icon: LinkIcon, label: 'Mailchimp', value: connectionStatus.mailchimp.connected ? 'Connected' : 'Not Connected', color: connectionStatus.mailchimp.connected ? 'success' : 'warning' },
            { icon: Shield, label: 'Security', value: 'Enabled', color: 'success' },
            { icon: Zap, label: 'Auto-Sync', value: settings.mailchimp.autoSync ? 'On' : 'Off', color: settings.mailchimp.autoSync ? 'success' : 'neutral' },
          ].map((stat, index) => (
            <GlassCard key={index} variant="default" padding="md" className="group">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/20 flex items-center justify-center
                  border border-${stat.color}-500/30 group-hover:scale-105 transition-transform`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                </div>
                <div>
                  <p className="text-xs text-neutral-400">{stat.label}</p>
                  <p className="font-semibold text-white text-sm">{stat.value}</p>
                </div>
              </div>
            </GlassCard>
          ))}
        </motion.div>

        {/* Email Configuration */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="strong" padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 
                flex items-center justify-center border border-primary-500/30">
                <EnvelopeIcon className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold font-display text-white">Email Configuration</h2>
                <p className="text-sm text-neutral-400">Configure your newsletter sender details</p>
              </div>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-200">From Name</label>
                <input
                  type="text"
                  value={settings.email.fromName}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, fromName: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-neutral-900/50 rounded-xl border border-white/10
                    focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="Your Newsletter Name"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-200">Reply-To Email</label>
                <input
                  type="email"
                  value={settings.email.replyTo}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, replyTo: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-neutral-900/50 rounded-xl border border-white/10
                    focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="reply@example.com"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-neutral-200">Sender Email</label>
                <input
                  type="email"
                  value={settings.email.senderEmail}
                  onChange={(e) => setSettings({
                    ...settings,
                    email: { ...settings.email, senderEmail: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-neutral-900/50 rounded-xl border border-white/10
                    focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="sender@yourdomain.com"
                />
                <p className="text-xs text-neutral-400 mt-1">
                  This email will be used as the sender address for your newsletters
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Mailchimp Integration */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="strong" padding="lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-warning-500/20 to-warning-600/20 
                  flex items-center justify-center border border-warning-500/30">
                  <Cog6ToothIcon className="w-6 h-6 text-warning-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold font-display text-white">Mailchimp Integration</h2>
                    {connectionStatus.mailchimp.connected && (
                      <Badge variant="success" size="sm">Connected</Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-400">Sync your subscribers with Mailchimp</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
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
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6"
              >
                <Badge
                  variant={connectionStatus.mailchimp.connected ? 'success' : 'primary'}
                  size="md"
                  className="w-full sm:w-auto"
                >
                  {connectionStatus.mailchimp.message}
                </Badge>
              </motion.div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-200">API Key</label>
                <input
                  type="password"
                  value={settings.mailchimp.apiKey}
                  onChange={(e) => setSettings({
                    ...settings,
                    mailchimp: { ...settings.mailchimp, apiKey: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-neutral-900/50 rounded-xl border border-white/10
                    focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="Enter your Mailchimp API key"
                />
                <p className="text-xs text-neutral-400">
                  Account → Extras → API Keys
                </p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-200">Server Prefix</label>
                <input
                  type="text"
                  value={settings.mailchimp.serverPrefix}
                  onChange={(e) => setSettings({
                    ...settings,
                    mailchimp: { ...settings.mailchimp, serverPrefix: e.target.value }
                  })}
                  className="w-full px-4 py-3 bg-neutral-900/50 rounded-xl border border-white/10
                    focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50
                    transition-all duration-200 text-white placeholder:text-neutral-500"
                  placeholder="e.g., us1, us2"
                />
                <p className="text-xs text-neutral-400">
                  From your Mailchimp URL: https://<strong>us1</strong>.admin.mailchimp.com
                </p>
              </div>
            </div>

            {connectionStatus.mailchimp.connected && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-6 space-y-4 border-t border-white/10 pt-6"
              >
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary-400" />
                      Enable Integration
                    </h3>
                    <p className="text-sm text-neutral-400">Connect your newsletter with Mailchimp</p>
                  </div>
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

                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white flex items-center gap-2">
                      <Settings className="w-4 h-4 text-secondary-400" />
                      Auto-Sync on Login
                    </h3>
                    <p className="text-sm text-neutral-400">Automatically sync when loading subscribers</p>
                  </div>
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
              </motion.div>
            )}
          </GlassCard>
        </motion.div>

        {/* Subscription Management */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="strong" padding="lg">
            <SubscriptionManagement />
          </GlassCard>
        </motion.div>
      </motion.div>
    </Container>
  );
}