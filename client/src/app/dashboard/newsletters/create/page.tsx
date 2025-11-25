"use client";
import React, { useState } from 'react';
import { Save, Calendar, Send, BookOpen, Lightbulb, FileCheck, Link } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { APIError, newsletterAPI } from '../../../../services/api';
import { Newsletter } from '../../../../types/index';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

type CreateNewsletterInput = Omit<Newsletter, 'id' | 'sentTo' | 'createdBy'>;

const CreateNewsletter: React.FC = () => {
  const router = useRouter();
  const [showScheduler, setShowScheduler] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);
  const [currentSource, setCurrentSource] = useState('');
  const [currentTakeaway, setCurrentTakeaway] = useState('');

  const [newsletter, setNewsletter] = useState<CreateNewsletterInput>({
    title: '',
    subject: '',
    content: '',
    status: 'draft',
    contentQuality: {
      isOriginalContent: false,
      hasResearchBacked: false,
      hasActionableInsights: false,
      contentLength: 0,
      sources: [],
      keyTakeaways: [],
      qualityScore: 0
    }
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
              status: draftResponse.status,
              contentQuality: draftResponse.contentQuality ?? {
              isOriginalContent: false,
              hasResearchBacked: false,
              hasActionableInsights: false,
              contentLength: 0,
              sources: [],
              keyTakeaways: [],
              qualityScore: 0
              }
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
    setTimeout(() => setShowNotification(false), 2000);
  };

  const saveDraft = async () => {
    setLoading(true);
    try {
      const newsletterData = {
        ...newsletter,
        status: 'draft' as const,
        scheduledDate: newsletter.scheduledDate instanceof Date ? newsletter.scheduledDate.toISOString() : newsletter.scheduledDate,
        sentDate: newsletter.sentDate instanceof Date ? newsletter.sentDate.toISOString() : newsletter.sentDate,
      };
      if (draftId) {
        await newsletterAPI.update(draftId, newsletterData);
      } else {
        await newsletterAPI.create(newsletterData);
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

      // Direct comparison of timestamps
      if (scheduledTime.getTime() <= now.getTime()) {
        showNotificationMessage('Schedule time must be in the future', 'error');
        return;
      }

      // Send the date directly without timezone adjustment since the input is already in local time
      await newsletterAPI.schedule(draftId, scheduledTime.toISOString());
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

  const sendNow = async () => {
    setLoading(true);
    try {
      const newsletterData = {
        ...newsletter,
        status: 'sent' as const,
        scheduledDate: newsletter.scheduledDate instanceof Date ? newsletter.scheduledDate.toISOString() : newsletter.scheduledDate,
        sentDate: newsletter.sentDate instanceof Date ? newsletter.sentDate.toISOString() : newsletter.sentDate,
      };
      const response = await newsletterAPI.create(newsletterData);

      if (response) {
        if ('id' in response) {
          await newsletterAPI.send(response.id);
          showNotificationMessage('Newsletter sent successfully!', 'success');
          router.push('/dashboard/newsletters');
        } else {
          const newsletterId = (response as { _id?: string; id?: string })._id || (response as { _id?: string; id?: string }).id;
          if (newsletterId) {
            await newsletterAPI.send(newsletterId);
            showNotificationMessage('Newsletter sent successfully!', 'success');
            router.push('/dashboard/newsletters');
          } else {
            showNotificationMessage('Failed to send newsletter', 'error');
          }
        }
      } else {
        showNotificationMessage('Failed to send newsletter', 'error');
      }
    } catch (error) {
      console.error('Error sending newsletter:', error);
      showNotificationMessage('Failed to send newsletter', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addSource = () => {
    if (currentSource.trim() && newsletter.contentQuality) {
      setNewsletter({
        ...newsletter,
        contentQuality: {
          ...newsletter.contentQuality,
          sources: [...newsletter.contentQuality.sources, currentSource.trim()]
        }
      });
      setCurrentSource('');
    }
  };

  const addTakeaway = () => {
    if (currentTakeaway.trim() && newsletter.contentQuality) {
      setNewsletter({
        ...newsletter,
        contentQuality: {
          ...newsletter.contentQuality,
          keyTakeaways: [...newsletter.contentQuality.keyTakeaways, currentTakeaway.trim()]
        }
      });
      setCurrentTakeaway('');
    }
  };

  return (
    <div className="p-4 sm:p-6 min-h-screen">
      <div className="max-w-4xl mx-auto">
        {showNotification && (
          <div className="fixed top-4 right-4 z-50 animate-fade-in">
            <div className={`px-4 py-3 rounded-lg backdrop-blur-sm shadow-glow-lg ${
              notificationType === 'success' 
                ? 'bg-success-500/10 border border-success-500/50 text-success-400' 
                : 'bg-error-500/10 border border-error-500/50 text-error-400'
            }`}>
              {notificationMessage}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display gradient-text">
            Create Newsletter
          </h1>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3 sm:gap-4">
            <button
              onClick={saveDraft}
              disabled={loading}
              className="w-full sm:w-auto glass hover:bg-white/10 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg 
                flex items-center justify-center gap-2 border border-white/10 
                hover:border-primary-500/50 transition-all duration-300
                disabled:opacity-50 text-white font-medium"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Draft'}
            </button>

            {!showScheduler ? (
              <button
                onClick={() => setShowScheduler(true)}
                className="w-full sm:w-auto bg-primary-500/20 hover:bg-primary-500/30 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg
                  flex items-center justify-center gap-2 backdrop-blur-sm border border-primary-500/50
                  text-primary-400 hover:text-primary-300 transition-all duration-300 font-medium"
              >
                <Calendar className="w-4 h-4" />
                Schedule
              </button>
            ) : (              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto 
                glass p-2 rounded-lg border border-white/10">                <input
                  type="datetime-local"
                  className="w-full sm:w-auto px-3 py-2 bg-neutral-900/50 rounded-lg border border-neutral-700 
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50
                    text-white text-sm"
                  defaultValue={(() => {
                    const now = new Date();
                    // Add 2 minutes to current time and format as local datetime string
                    now.setMinutes(now.getMinutes() + 2);
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    return `${year}-${month}-${day}T${hours}:${minutes}`;
                  })()}
                  min={(() => {
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const day = String(now.getDate()).padStart(2, '0');
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    return `${year}-${month}-${day}T${hours}:${minutes}`;
                  })()}
                  onChange={(e) => {
                    const selectedDate = new Date(e.target.value);
                    const now = new Date();
                    if (selectedDate.getTime() < now.getTime()) {
                      // If selected time is in the past, set it to current time + 2 minutes
                      now.setMinutes(now.getMinutes() + 2);
                      const year = now.getFullYear();
                      const month = String(now.getMonth() + 1).padStart(2, '0');
                      const day = String(now.getDate()).padStart(2, '0');
                      const hours = String(now.getHours()).padStart(2, '0');
                      const minutes = String(now.getMinutes()).padStart(2, '0');
                      e.target.value = `${year}-${month}-${day}T${hours}:${minutes}`;
                    }
                    scheduleNewsletter(e.target.value);
                  }}
                />
                <button
                  onClick={() => setShowScheduler(false)}
                  className="w-full sm:w-auto text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-white/10
                    transition-colors text-center font-medium"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              onClick={sendNow}
              disabled={loading}
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg
                flex items-center justify-center gap-2 transition-all duration-300
                hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Sending...' : 'Send Now'}
            </button>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          <div className="glass p-4 sm:p-8 rounded-2xl
            border border-white/10 hover:border-primary-500/50 transition-all duration-300">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-200">Newsletter Title</label>
                <input
                  type="text"
                  value={newsletter.title}
                  onChange={(e) => setNewsletter({ ...newsletter, title: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-900/50 rounded-lg border border-neutral-700
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50
                    placeholder-neutral-500 text-sm sm:text-base text-white"
                  placeholder="Enter newsletter title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-200">Email Subject</label>
                <input
                  type="text"
                  value={newsletter.subject}
                  onChange={(e) => setNewsletter({ ...newsletter, subject: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-900/50 rounded-lg border border-neutral-700
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50
                    placeholder-neutral-500 text-sm sm:text-base text-white"
                  placeholder="Enter email subject"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-200">Content</label>
                <textarea
                  value={newsletter.content}
                  onChange={(e) => setNewsletter({ ...newsletter, content: e.target.value })}
                  className="w-full h-64 sm:h-96 px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-900/50 rounded-lg border border-neutral-700
                    focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50
                    placeholder-neutral-500 resize-none text-sm sm:text-base text-white"
                  placeholder="Write your newsletter content here..."
                />
              </div>
            </div>
          </div>

          <div className="glass p-4 sm:p-8 rounded-2xl
            border border-white/10 hover:border-primary-500/50 transition-all duration-300">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-white">Content Quality Metrics</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newsletter.contentQuality?.isOriginalContent}
                      onChange={(e) => setNewsletter({
                        ...newsletter,
                        contentQuality: {
                          ...newsletter.contentQuality!,
                          isOriginalContent: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer 
                      peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['']
                      after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full
                      after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary-500 peer-checked:to-primary-600"></div>
                  </label>
                  <span className="flex items-center gap-2 text-sm sm:text-base text-white">
                    <FileCheck className="w-5 h-5 text-primary-400" />
                    Original Content
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newsletter.contentQuality?.hasResearchBacked}
                      onChange={(e) => setNewsletter({
                        ...newsletter,
                        contentQuality: {
                          ...newsletter.contentQuality!,
                          hasResearchBacked: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer 
                      peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['']
                      after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full
                      after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary-500 peer-checked:to-primary-600"></div>
                  </label>
                  <span className="flex items-center gap-2 text-sm sm:text-base text-white">
                    <BookOpen className="w-5 h-5 text-secondary-400" />
                    Research Backed
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newsletter.contentQuality?.hasActionableInsights}
                      onChange={(e) => setNewsletter({
                        ...newsletter,
                        contentQuality: {
                          ...newsletter.contentQuality!,
                          hasActionableInsights: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer 
                      peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['']
                      after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full
                      after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary-500 peer-checked:to-primary-600"></div>
                  </label>
                  <span className="flex items-center gap-2 text-sm sm:text-base text-white">
                    <Lightbulb className="w-5 h-5 text-accent-400" />
                    Actionable Insights
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-200">Sources</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={currentSource}
                    onChange={(e) => setCurrentSource(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSource()}
                    className="flex-1 px-3 sm:px-4 py-2 bg-neutral-900/50 rounded-lg border border-neutral-700
                      focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 text-sm sm:text-base text-white placeholder:text-neutral-500"
                    placeholder="Add a source..."
                  />
                  <button
                    onClick={addSource}
                    className="w-full sm:w-auto px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg
                      hover:bg-primary-500/30 transition-colors flex items-center justify-center gap-2 font-medium border border-primary-500/30"
                  >
                    <Link className="w-4 h-4" />
                    <span className="sm:hidden">Add Source</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newsletter.contentQuality?.sources.map((source, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-primary-500/20 text-primary-400 rounded-full text-sm break-all border border-primary-500/30"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-neutral-200">Key Takeaways</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={currentTakeaway}
                    onChange={(e) => setCurrentTakeaway(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTakeaway()}
                    className="flex-1 px-3 sm:px-4 py-2 bg-neutral-900/50 rounded-lg border border-neutral-700
                      focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 text-sm sm:text-base text-white placeholder:text-neutral-500"
                    placeholder="Add a key takeaway..."
                  />
                  <button
                    onClick={addTakeaway}
                    className="w-full sm:w-auto px-4 py-2 bg-success-500/20 text-success-400 rounded-lg
                      hover:bg-success-500/30 transition-colors flex items-center justify-center gap-2 font-medium border border-success-500/30"
                  >
                    <Lightbulb className="w-4 h-4" />
                    <span className="sm:hidden">Add Takeaway</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newsletter.contentQuality?.keyTakeaways.map((takeaway, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-success-500/20 text-success-400 rounded-full text-sm break-all border border-success-500/30"
                    >
                      {takeaway}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateNewsletter;