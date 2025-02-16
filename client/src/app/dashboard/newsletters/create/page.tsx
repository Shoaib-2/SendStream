"use client";
import React, { useState } from 'react';
import { Save, Calendar, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { newsletterAPI } from '../../../../services/api';
import { Newsletter } from '../../../../types/index';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

type CreateNewsletterInput = Omit<Newsletter, 'id' | 'sentTo' | 'openRate' | 'clickRate' | 'createdBy'>;

const CreateNewsletter = () => {
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
      console.log('Selected date:', date)
      const scheduledTime = new Date(date).toISOString(); // Convert to ISO string
      const result = await newsletterAPI.create({
        ...newsletter,
        status: 'scheduled',
        scheduledDate: scheduledTime // Pass the ISO string
      });

      if (result && result._id) {
        await newsletterAPI.schedule(result._id, scheduledTime);
        showNotificationMessage('Newsletter scheduled!', 'success');
        router.push('/dashboard/newsletters');
      }
    } catch (error) {
      showNotificationMessage('Scheduling failed', 'error');
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
    <div className="p-6 max-w-4xl mx-auto relative">
      {showNotification && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg z-50 text-white ${notificationType === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {notificationMessage}
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold hover:bg-gray-600">Create Newsletter</h1>
        <div className="flex gap-4">
          <button
            onClick={saveDraft}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            disabled={loading} // Disable button while loading
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Draft'}
          </button>
          {!showScheduler ? (
            <button
              onClick={() => setShowScheduler(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <Calendar className="w-4 h-4" />
              Schedule
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-lg shadow-lg">
              <input
                type="datetime-local"
                className="px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                defaultValue={new Date(Date.now() + 2 * 60 * 1000).toISOString().slice(0, 16)}
                onChange={(e) => scheduleNewsletter(e.target.value)}
              />
              <button
                onClick={() => setShowScheduler(false)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
          <button
            onClick={sendNow}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
            disabled={loading} // Disable button while loading
          >
            <Send className="w-4 h-4" />
            {loading ? 'Sending...' : 'Send Now'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Newsletter Title</label>
          <input
            type="text"
            value={newsletter.title}
            onChange={(e) => setNewsletter({ ...newsletter, title: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Newsletter Title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email Subject</label>
          <input
            type="text"
            value={newsletter.subject}
            onChange={(e) => setNewsletter({ ...newsletter, subject: e.target.value })}
            className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Email Subject"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Content</label>
          <textarea
            value={newsletter.content}
            onChange={(e) => setNewsletter({ ...newsletter, content: e.target.value })}
            className="w-full h-96 px-4 py-2 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Write your newsletter content here..."
          />
        </div>
      </div>
    </div>
  );
};

export default CreateNewsletter;