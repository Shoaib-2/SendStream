"use client";
import React, { useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Calendar, Send, BookOpen, Lightbulb, FileCheck, Link, ArrowLeft, X, CheckCircle, Sparkles, Clock, Wand2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { APIError, newsletterAPI, aiAPI, SmartScheduleRecommendation } from '../../../../services/api';
import { Newsletter } from '../../../../types/index';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Container from '@/components/UI/Container';
import GlassCard from '@/components/UI/GlassCard';
import Button from '@/components/UI/Button';
import Badge from '@/components/UI/Badge';

type CreateNewsletterInput = Omit<Newsletter, 'id' | 'sentTo' | 'createdBy'>;

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

const CreateNewsletterContent: React.FC = () => {
  const router = useRouter();
  const [showScheduler, setShowScheduler] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'success' | 'error'>('success');
  const [loading, setLoading] = useState(false);
  const [currentSource, setCurrentSource] = useState('');
  const [currentTakeaway, setCurrentTakeaway] = useState('');

  // AI State
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState<'professional' | 'casual' | 'friendly' | 'authoritative'>('professional');
  const [aiLength, setAiLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [smartSchedule, setSmartSchedule] = useState<SmartScheduleRecommendation | null>(null);
  const [subjectSuggestions, setSubjectSuggestions] = useState<string[]>([]);

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

      if (scheduledTime.getTime() <= now.getTime()) {
        showNotificationMessage('Schedule time must be in the future', 'error');
        return;
      }

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

  const removeSource = (index: number) => {
    if (newsletter.contentQuality) {
      setNewsletter({
        ...newsletter,
        contentQuality: {
          ...newsletter.contentQuality,
          sources: newsletter.contentQuality.sources.filter((_, i) => i !== index)
        }
      });
    }
  };

  const removeTakeaway = (index: number) => {
    if (newsletter.contentQuality) {
      setNewsletter({
        ...newsletter,
        contentQuality: {
          ...newsletter.contentQuality,
          keyTakeaways: newsletter.contentQuality.keyTakeaways.filter((_, i) => i !== index)
        }
      });
    }
  };

  // AI Functions
  const generateAIContent = async () => {
    if (!aiTopic.trim()) {
      showNotificationMessage('Please enter a topic for AI generation', 'error');
      return;
    }

    setAiLoading(true);
    try {
      const generated = await aiAPI.generateContent({
        topic: aiTopic,
        tone: aiTone,
        length: aiLength,
        includeCallToAction: true
      });

      setNewsletter({
        ...newsletter,
        title: generated.title,
        subject: generated.subject,
        content: generated.content,
        contentQuality: {
          ...newsletter.contentQuality!,
          isOriginalContent: true,
          hasResearchBacked: true,
          hasActionableInsights: true,
          sources: generated.sources,
          keyTakeaways: generated.keyTakeaways,
          qualityScore: 85
        }
      });

      setShowAIPanel(false);
      showNotificationMessage('Content generated successfully!', 'success');
    } catch (error) {
      console.error('AI generation error:', error);
      showNotificationMessage('Failed to generate content. Please try again.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const improveExistingContent = async () => {
    if (!newsletter.content.trim()) {
      showNotificationMessage('Please add some content first', 'error');
      return;
    }

    setAiLoading(true);
    try {
      const improved = await aiAPI.improveContent(newsletter.content);
      setNewsletter({ ...newsletter, content: improved });
      showNotificationMessage('Content improved!', 'success');
    } catch (error) {
      console.error('AI improvement error:', error);
      showNotificationMessage('Failed to improve content', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const generateSubjectSuggestions = async () => {
    const topic = newsletter.title || aiTopic;
    if (!topic.trim()) {
      showNotificationMessage('Please add a title first', 'error');
      return;
    }

    setAiLoading(true);
    try {
      const suggestions = await aiAPI.generateSubjects(topic, newsletter.content);
      setSubjectSuggestions(suggestions);
    } catch (error) {
      console.error('Subject generation error:', error);
      showNotificationMessage('Failed to generate subjects', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const getSmartScheduleRecommendation = async () => {
    setAiLoading(true);
    try {
      const recommendation = await aiAPI.getSmartSchedule();
      setSmartSchedule(recommendation);
    } catch (error) {
      console.error('Smart schedule error:', error);
      showNotificationMessage('Failed to get schedule recommendation', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const applySmartSchedule = () => {
    if (!smartSchedule) return;
    
    // Calculate the next occurrence of the recommended day/time
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayIndex = days.indexOf(smartSchedule.recommendedDay);
    const [hours, minutes] = smartSchedule.recommendedTime.split(':').map(Number);
    
    const now = new Date();
    const targetDate = new Date();
    const currentDayIndex = now.getDay();
    
    let daysUntilTarget = targetDayIndex - currentDayIndex;
    if (daysUntilTarget <= 0) daysUntilTarget += 7;
    
    targetDate.setDate(now.getDate() + daysUntilTarget);
    targetDate.setHours(hours, minutes, 0, 0);
    
    // If the target time is in the past today, move to next week
    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 7);
    }

    setNewsletter({ ...newsletter, scheduledDate: targetDate });
    setSmartSchedule(null);
    showNotificationMessage(`Scheduled for ${smartSchedule.recommendedDay} at ${smartSchedule.recommendedTime}`, 'success');
  };

  return (
    <Container size="lg" className="py-8 min-h-screen">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Notification */}
        <AnimatePresence>
          {showNotification && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50"
            >
              <Badge 
                variant={notificationType === 'success' ? 'success' : 'error'}
                size="lg"
                className="shadow-glow-lg flex items-center gap-2"
              >
                {notificationType === 'success' && <CheckCircle className="w-4 h-4" />}
                {notificationMessage}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard/newsletters')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 
                hover:border-primary-500/30 transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-400" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display gradient-text">
                {draftId ? 'Edit Newsletter' : 'Create Newsletter'}
              </h1>
              <p className="text-neutral-400 text-sm mt-1">Craft your message and reach your audience</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <Button
              onClick={() => setShowAIPanel(!showAIPanel)}
              variant="secondary"
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="flex-1 lg:flex-none bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-500/50"
            >
              AI Assistant
            </Button>
            
            <Button
              onClick={saveDraft}
              disabled={loading}
              variant="secondary"
              leftIcon={<Save className="w-4 h-4" />}
              className="flex-1 lg:flex-none"
            >
              {loading ? 'Saving...' : 'Save Draft'}
            </Button>

            {!showScheduler ? (
              <Button
                onClick={() => setShowScheduler(true)}
                variant="primary"
                leftIcon={<Calendar className="w-4 h-4" />}
                className="flex-1 lg:flex-none"
              >
                Schedule
              </Button>
            ) : (
              <GlassCard variant="default" padding="sm" className="flex-1 lg:flex-none">
                <div className="flex items-center gap-2">
                  <input
                    type="datetime-local"
                    className="px-3 py-2 bg-neutral-900/50 rounded-lg border border-white/10 
                      focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50
                      text-white text-sm"
                    defaultValue={(() => {
                      const now = new Date();
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
                    className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </GlassCard>
            )}

            <Button
              onClick={sendNow}
              disabled={loading}
              variant="gradient"
              leftIcon={<Send className="w-4 h-4" />}
              className="flex-1 lg:flex-none bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700"
            >
              {loading ? 'Sending...' : 'Send Now'}
            </Button>
          </div>
        </motion.div>

        {/* AI Assistant Panel */}
        <AnimatePresence>
          {showAIPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              variants={itemVariants}
            >
              <GlassCard variant="strong" padding="lg" className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 
                      flex items-center justify-center border border-purple-500/40">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold font-display text-white">AI Content Assistant</h2>
                      <p className="text-sm text-neutral-400">Generate engaging, research-backed content</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAIPanel(false)}
                    className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Generate New Content */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-neutral-200 flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-purple-400" />
                      Generate New Content
                    </h3>
                    
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="Enter your newsletter topic..."
                      className="w-full px-4 py-3 bg-neutral-900/50 rounded-xl border border-white/10
                        focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/30
                        placeholder-neutral-500 text-sm text-white transition-all duration-200"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <select
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value as typeof aiTone)}
                        className="px-3 py-2 bg-neutral-900/50 rounded-lg border border-white/10 
                          focus:border-purple-500/50 text-sm text-white"
                      >
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="friendly">Friendly</option>
                        <option value="authoritative">Authoritative</option>
                      </select>

                      <select
                        value={aiLength}
                        onChange={(e) => setAiLength(e.target.value as typeof aiLength)}
                        className="px-3 py-2 bg-neutral-900/50 rounded-lg border border-white/10 
                          focus:border-purple-500/50 text-sm text-white"
                      >
                        <option value="short">Short (300-500 words)</option>
                        <option value="medium">Medium (500-800 words)</option>
                        <option value="long">Long (800-1200 words)</option>
                      </select>
                    </div>

                    <Button
                      onClick={generateAIContent}
                      disabled={aiLoading || !aiTopic.trim()}
                      variant="primary"
                      leftIcon={aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      {aiLoading ? 'Generating...' : 'Generate Content'}
                    </Button>
                  </div>

                  {/* Smart Scheduling & Tools */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-neutral-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-400" />
                      Smart Tools
                    </h3>

                    <Button
                      onClick={improveExistingContent}
                      disabled={aiLoading || !newsletter.content.trim()}
                      variant="secondary"
                      leftIcon={aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      className="w-full"
                    >
                      Improve Existing Content
                    </Button>

                    <Button
                      onClick={generateSubjectSuggestions}
                      disabled={aiLoading || (!newsletter.title.trim() && !aiTopic.trim())}
                      variant="secondary"
                      leftIcon={aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                      className="w-full"
                    >
                      Generate Subject Lines
                    </Button>

                    <Button
                      onClick={getSmartScheduleRecommendation}
                      disabled={aiLoading}
                      variant="secondary"
                      leftIcon={aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      className="w-full"
                    >
                      Get Optimal Send Time
                    </Button>

                    {/* Subject Suggestions */}
                    {subjectSuggestions.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <p className="text-xs text-neutral-400">Click to use:</p>
                        {subjectSuggestions.map((subject, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setNewsletter({ ...newsletter, subject });
                              setSubjectSuggestions([]);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-white bg-white/5 hover:bg-white/10 
                              rounded-lg border border-white/10 hover:border-purple-500/30 transition-all"
                          >
                            {subject}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Smart Schedule Recommendation */}
                    {smartSchedule && (
                      <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-purple-300">Recommended Time</span>
                          <Badge variant="success" size="sm">
                            {smartSchedule.recommendedDay} {smartSchedule.recommendedTime}
                          </Badge>
                        </div>
                        <p className="text-xs text-neutral-400">{smartSchedule.reasoning}</p>
                        <div className="flex gap-2">
                          <Button
                            onClick={applySmartSchedule}
                            variant="primary"
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
                          >
                            Apply Schedule
                          </Button>
                          <Button
                            onClick={() => setSmartSchedule(null)}
                            variant="secondary"
                            size="sm"
                          >
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="strong" padding="lg">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-200">Newsletter Title</label>
                <input
                  type="text"
                  value={newsletter.title}
                  onChange={(e) => setNewsletter({ ...newsletter, title: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-900/50 rounded-xl border border-white/10
                    focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50
                    placeholder-neutral-500 text-sm sm:text-base text-white transition-all duration-200"
                  placeholder="Enter a compelling title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-200">Email Subject</label>
                <input
                  type="text"
                  value={newsletter.subject}
                  onChange={(e) => setNewsletter({ ...newsletter, subject: e.target.value })}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-900/50 rounded-xl border border-white/10
                    focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50
                    placeholder-neutral-500 text-sm sm:text-base text-white transition-all duration-200"
                  placeholder="Subject line your subscribers will see..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-200">Content</label>
                <textarea
                  value={newsletter.content}
                  onChange={(e) => setNewsletter({ ...newsletter, content: e.target.value })}
                  className="w-full h-48 sm:h-72 md:h-96 px-3 sm:px-4 py-2.5 sm:py-3 bg-neutral-900/50 rounded-xl border border-white/10
                    focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50
                    placeholder-neutral-500 resize-none text-sm sm:text-base text-white transition-all duration-200"
                  placeholder="Write your newsletter content here... Use HTML for formatting."
                />
                <p className="text-xs text-neutral-500 mt-2">
                  {newsletter.content.length} characters • HTML formatting supported
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Content Quality Section */}
        <motion.div variants={itemVariants}>
          <GlassCard variant="strong" padding="lg">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-secondary-500/20 to-secondary-600/20 
                flex items-center justify-center border border-secondary-500/30">
                <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-secondary-400" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold font-display text-white">Content Quality</h2>
                <p className="text-xs sm:text-sm text-neutral-400">Track and improve your content quality</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Quality Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { key: 'isOriginalContent', label: 'Original Content', icon: FileCheck, color: 'primary' },
                  { key: 'hasResearchBacked', label: 'Research Backed', icon: BookOpen, color: 'secondary' },
                  { key: 'hasActionableInsights', label: 'Actionable Insights', icon: Lightbulb, color: 'warning' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newsletter.contentQuality?.[item.key as keyof typeof newsletter.contentQuality] as boolean}
                        onChange={(e) => setNewsletter({
                          ...newsletter,
                          contentQuality: {
                            ...newsletter.contentQuality!,
                            [item.key]: e.target.checked
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer 
                        peer-checked:after:translate-x-full peer-checked:after:border-white after:content-['']
                        after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full
                        after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-primary-500 peer-checked:to-primary-600"></div>
                    </label>
                    <span className="flex items-center gap-2 text-sm text-white">
                      <item.icon className={`w-4 h-4 text-${item.color}-400`} />
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Sources */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-neutral-200">Sources</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={currentSource}
                    onChange={(e) => setCurrentSource(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSource()}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-900/50 rounded-xl border border-white/10
                      focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50 text-sm sm:text-base text-white placeholder:text-neutral-500"
                    placeholder="Add a source URL or reference..."
                  />
                  <Button onClick={addSource} variant="secondary" leftIcon={<Link className="w-4 h-4" />}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newsletter.contentQuality?.sources.map((source, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group px-3 py-1.5 bg-primary-500/20 text-primary-400 rounded-lg text-sm 
                        border border-primary-500/30 flex items-center gap-2"
                    >
                      <span className="max-w-[200px] truncate">{source}</span>
                      <button 
                        onClick={() => removeSource(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Key Takeaways */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-neutral-200">Key Takeaways</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={currentTakeaway}
                    onChange={(e) => setCurrentTakeaway(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTakeaway()}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-neutral-900/50 rounded-xl border border-white/10
                      focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/50 text-sm sm:text-base text-white placeholder:text-neutral-500"
                    placeholder="What's the key takeaway for readers?"
                  />
                  <Button onClick={addTakeaway} variant="secondary" leftIcon={<Lightbulb className="w-4 h-4" />}>
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {newsletter.contentQuality?.keyTakeaways.map((takeaway, index) => (
                    <motion.span
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="group px-3 py-1.5 bg-success-500/20 text-success-400 rounded-lg text-sm 
                        border border-success-500/30 flex items-center gap-2"
                    >
                      <span className="max-w-[250px] truncate">{takeaway}</span>
                      <button 
                        onClick={() => removeTakeaway(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.span>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </Container>
  );
};

export default function CreateNewsletter() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-primary-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin" />
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary-500/20 to-secondary-500/20 blur-xl" />
        </div>
      </div>
    }>
      <CreateNewsletterContent />
    </Suspense>
  );
}