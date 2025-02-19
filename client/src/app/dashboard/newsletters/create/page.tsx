"use client";
import React, { useState } from 'react';
import { Save, Calendar, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { APIError, newsletterAPI } from '../../../../services/api';
import { Newsletter } from '../../../../types/index';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

type CreateNewsletterInput = Omit<Newsletter, 'id' | 'sentTo' | 'openRate' | 'clickRate' | 'createdBy'>;

const CreateNewsletter: React.FC = () => {
  const router = useRouter()
  const [showScheduler, setShowScheduler] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false); // New loading state
  const [newsletter, setNewsletter] = useState<CreateNewsletterInput>({
    title: '',
    subject: '',
    content: '',
    status: 'draft'
  });

  const searchParams = useSearchParams();
  const draftId = searchParams.get('id');

  useEffect(() => {
    if (draftId) {
      const loadDraft = async () => {
        try {
          const draftResponse = await newsletterAPI.getOne(draftId);
          if (draftResponse) {
            setNewsletter({
              title: draftResponse.title,
              subject: draftResponse.subject,
              content: draftResponse.content,
              status: draftResponse.status
            });
          }
        } catch (error) {
          console.error('Error loading draft:', error);
          showNotificationMessage('Failed to load draft', 'error');
        }
      };
      loadDraft();
    }
  }, [draftId]);

  const showNotificationMessage = (message: string, type: 'success' | 'error') => {
    setNotificationMessage(message);
    setNotificationType(type);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 2000);
  };

  const saveDraft = async () => {
    setLoading(true);
    try {
      if (draftId) {
        await newsletterAPI.update(draftId, { ...newsletter, status: 'draft' });
      } else {
        await newsletterAPI.create({ ...newsletter, status: 'draft' });
      }
      showNotificationMessage('Draft saved successfully!', 'success');
      router.push('/dashboard/newsletters');
    } catch (error) {
      console.error('Error saving draft:', error);
      showNotificationMessage('Failed to save draft', 'error');
    } finally {
      setLoading(false);
    }
  };

  const scheduleNewsletter = async (date: string) => {
    try {
      if (!draftId) {
        showNotificationMessage('Please save the newsletter as a draft first', 'error');
        return;
      }

      const scheduledTime = new Date(date);
      const now = new Date();
      const timezoneOffset = scheduledTime.getTimezoneOffset() * 60000;
      const utcTimestamp = scheduledTime.getTime() + timezoneOffset;
      
      if (utcTimestamp <= now.getTime()) {
        showNotificationMessage('Schedule time must be in the future', 'error');
        return;
      }

      console.log('Scheduling for UTC:', new Date(utcTimestamp).toISOString());
      const response = await newsletterAPI.schedule(draftId, new Date(utcTimestamp).toISOString());
      console.log('Schedule response:', response);
      showNotificationMessage('Newsletter scheduled!', 'success');
      router.push('/dashboard/newsletters');
    } catch (error) {
      console.error('Error scheduling newsletter:', error);
      if (error instanceof APIError) {
        showNotificationMessage(error.message, 'error');
      } else {
        showNotificationMessage('Scheduling failed', 'error');
      }
    }
  };

  // Add a check for the response structure
  const sendNow = async () => {
    setLoading(true); // Set loading state
    try {
      const response = await newsletterAPI.create({
        ...newsletter,
        status: 'sent'
      });
      console.log('Send Now Response:', response); // Log the response

      // Check if the response is defined
      if (response) {
        // Check if the response has an id property
        if ('id' in response) {
          // Call the send method with the correct id
          await newsletterAPI.send(response.id);
          showNotificationMessage('Newsletter sent successfully!', 'success');
          router.push('/dashboard/newsletters'); // Redirect to the dashboard immediately
        } else {
          // If the response does not have an id property, try to extract it from the response object
          const newsletterId = (response as any)._id || (response as any).id;
          if (newsletterId) {
            await newsletterAPI.send(newsletterId);
            showNotificationMessage('Newsletter sent successfully!', 'success');
            router.push('/dashboard/newsletters'); // Redirect to the dashboard immediately
          } else {
            console.error('Unexpected response structure:', response); // Log the unexpected response
            showNotificationMessage('Failed to send newsletter', 'error');
          }
        }
      } else {
        console.error('No response received'); // Log the error
        showNotificationMessage('Failed to send newsletter', 'error');
      }
    } catch (error) {
      console.error('Error sending newsletter:', error);
      showNotificationMessage('Failed to send newsletter', 'error');
    } finally {
      setLoading(false); // Reset loading state
    }
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-900/50">
      <div className="max-w-4xl mx-auto">
        {showNotification && (
          <div className={`fixed top-4 right-4 p-4 rounded-xl backdrop-blur-sm z-50 ${
            notificationType === 'success' 
              ? 'bg-green-500/10 border border-green-500/50 text-green-500' 
              : 'bg-red-500/10 border border-red-500/50 text-red-500'
          }`}>
            {notificationMessage}
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-inter bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
            Create Newsletter
          </h1>
          <div className="flex gap-4">
            <button
              onClick={saveDraft}
              disabled={loading}
              className="bg-gray-800/50 hover:bg-gray-700/50 px-6 py-3 rounded-lg 
                flex items-center gap-2 backdrop-blur-sm border border-gray-700 
                hover:border-blue-500/50 transition-all duration-300
                disabled:opacity-50 disabled:hover:border-gray-700"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Draft'}
            </button>

            {!showScheduler ? (
              <button
                onClick={() => setShowScheduler(true)}
                className="bg-blue-500/20 hover:bg-blue-500/30 px-6 py-3 rounded-lg
                  flex items-center gap-2 backdrop-blur-sm border border-blue-500/50
                  text-blue-400 hover:text-blue-300 transition-all duration-300"
              >
                <Calendar className="w-4 h-4" />
                Schedule
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg backdrop-blur-sm border border-gray-700">
                <input
                  type="datetime-local"
                  className="px-4 py-2 bg-gray-700/50 rounded-lg border border-gray-600 
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                    text-gray-200"
                  defaultValue={new Date(Date.now() + 2 * 60 * 1000).toISOString().slice(0, 16)}
                  onChange={(e) => scheduleNewsletter(e.target.value)}
                />
                <button
                  onClick={() => setShowScheduler(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700/50
                    transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              onClick={sendNow}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 px-6 py-3 rounded-lg
                flex items-center gap-2 transition-all duration-300
                hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Sending...' : 'Send Now'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl
            border border-gray-700 hover:border-blue-500/50 transition-all duration-300">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Newsletter Title</label>
                <input
                  type="text"
                  value={newsletter.title}
                  onChange={(e) => setNewsletter({ ...newsletter, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                    placeholder-gray-500"
                  placeholder="Enter newsletter title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Email Subject</label>
                <input
                  type="text"
                  value={newsletter.subject}
                  onChange={(e) => setNewsletter({ ...newsletter, subject: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                    placeholder-gray-500"
                  placeholder="Enter email subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Content</label>
                <textarea
                  value={newsletter.content}
                  onChange={(e) => setNewsletter({ ...newsletter, content: e.target.value })}
                  className="w-full h-96 px-4 py-3 bg-gray-700/50 rounded-lg border border-gray-600
                    focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50
                    placeholder-gray-500 resize-none"
                  placeholder="Write your newsletter content here..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNewsletter;