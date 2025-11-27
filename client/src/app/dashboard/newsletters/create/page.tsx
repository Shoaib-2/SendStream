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
  const [sendLoading, setSendLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [currentSource, setCurrentSource] = useState('');
  const [currentTakeaway, setCurrentTakeaway] = useState('');

  // AI State
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [improveLoading, setImproveLoading] = useState(false);
  const [subjectLoading, setSubjectLoading] = useState(false);
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
    setTimeout(() => setShowNotification(false), 5000);
  };

  const saveDraft = async (silent = false): Promise<string | null> => {
    setLoading(true);
    try {
      const newsletterData = {
        ...newsletter,
        status: 'draft' as const,
        scheduledDate: newsletter.scheduledDate instanceof Date ? newsletter.scheduledDate.toISOString() : newsletter.scheduledDate,
        sentDate: newsletter.sentDate instanceof Date ? newsletter.sentDate.toISOString() : newsletter.sentDate,
      };
      
      let savedId = draftId;
      
      if (draftId) {
        await newsletterAPI.update(draftId, newsletterData);
      } else {
        const response = await newsletterAPI.create(newsletterData);
        savedId = response.id || response._id || null;
      }
      
      if (!silent) {
        showNotificationMessage('Draft saved successfully!', 'success');
        router.push('/dashboard/newsletters');
      }
      
      return savedId;
    } catch (error) {
      console.error('Error saving draft:', error);
      if (!silent) {
        showNotificationMessage('Failed to save draft', 'error');
      }
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  const scheduleNewsletter = async (date: string) => {
    setScheduleLoading(true);
    try {
      // Auto-save as draft first if not already saved
      let newsletterId = draftId;
      if (!newsletterId) {
        newsletterId = await saveDraft(true);
        if (!newsletterId) {
          showNotificationMessage('Failed to save draft before scheduling', 'error');
          return;
        }
      }

      const scheduledTime = new Date(date);
      const now = new Date();

      if (scheduledTime.getTime() <= now.getTime()) {
        showNotificationMessage('Schedule time must be in the future', 'error');
        return;
      }

      await newsletterAPI.schedule(newsletterId, scheduledTime.toISOString());
      showNotificationMessage('Newsletter scheduled!', 'success');
      setShowScheduler(false);
      setTimeout(() => router.push('/dashboard/newsletters'), 1000);
    } catch (error) {
      console.error('Error scheduling newsletter:', error);
      if (error instanceof APIError) {
        showNotificationMessage(error.message, 'error');
      } else {
        showNotificationMessage('Scheduling failed', 'error');
      }
    } finally {
      setScheduleLoading(false);
    }
  };

  const sendNow = async () => {
    setSendLoading(true);
    try {
      const newsletterData = {
        ...newsletter,
        status: 'sent' as const,
        scheduledDate: newsletter.scheduledDate instanceof Date ? newsletter.scheduledDate.toISOString() : newsletter.scheduledDate,
        sentDate: newsletter.sentDate instanceof Date ? newsletter.sentDate.toISOString() : newsletter.sentDate,
      };
      
      let newsletterId = draftId;
      
      // Update existing draft or create new
      if (draftId) {
        await newsletterAPI.update(draftId, newsletterData);
      } else {
        const response = await newsletterAPI.create(newsletterData);
        newsletterId = response.id || response._id || null;
      }

      if (newsletterId) {
        await newsletterAPI.send(newsletterId);
        showNotificationMessage('Newsletter sent successfully!', 'success');
        setTimeout(() => router.push('/dashboard/newsletters'), 1000);
      } else {
        showNotificationMessage('Failed to send newsletter', 'error');
      }
    } catch (error) {
      console.error('Error sending newsletter:', error);
      showNotificationMessage('Failed to send newsletter', 'error');
    } finally {
      setSendLoading(false);
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

    setGenerateLoading(true);
    try {
      console.log('Generating content for topic:', aiTopic);
      const generated = await aiAPI.generateContent({
        topic: aiTopic,
        tone: aiTone,
        length: aiLength,
        includeCallToAction: true
      });

      console.log('Generated content received:', generated);

      if (!generated || !generated.content) {
        throw new Error('Invalid response from AI');
      }

      setNewsletter({
        ...newsletter,
        title: generated.title,
        subject: generated.subject,
        content: generated.content,
        contentQuality: {
          isOriginalContent: true,
          hasResearchBacked: true,
          hasActionableInsights: true,
          contentLength: generated.content.length,
          sources: generated.sources || [],
          keyTakeaways: generated.keyTakeaways || [],
          qualityScore: 85
        }
      });

      showNotificationMessage('Content generated successfully!', 'success');
      setAiTopic(''); // Clear topic after generation
    } catch (error: unknown) {
      console.error('AI generation error:', error);
      
      // Check if it's an authentication error
      if (error instanceof APIError) {
        if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          showNotificationMessage('Session expired. Please login again.', 'error');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
        if (error.message.includes('429') || error.message.includes('limit reached')) {
          showNotificationMessage(error.message, 'error');
          return;
        }
      }
      
      const message = error instanceof Error ? error.message : 'Failed to generate content';
      showNotificationMessage(message, 'error');
    } finally {
      setGenerateLoading(false);
    }
  };

  const improveExistingContent = async () => {
    if (!newsletter.content.trim()) {
      showNotificationMessage('Please add some content first', 'error');
      return;
    }

    setImproveLoading(true);
    try {
      console.log('Improving content...');
      const improved = await aiAPI.improveContent(newsletter.content);
      console.log('Improved content received');
      
      if (!improved) {
        throw new Error('Invalid response from AI');
      }

      setNewsletter({ ...newsletter, content: improved });
      showNotificationMessage('Content improved successfully!', 'success');
    } catch (error: unknown) {
      console.error('AI improvement error:', error);
      
      // Check if it's an authentication error
      if (error instanceof APIError) {
        if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          showNotificationMessage('Session expired. Please login again.', 'error');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
        if (error.message.includes('429') || error.message.includes('limit reached')) {
          showNotificationMessage(error.message, 'error');
          return;
        }
      }
      
      const message = error instanceof Error ? error.message : 'Failed to improve content';
      showNotificationMessage(message, 'error');
    } finally {
      setImproveLoading(false);
    }
  };

  const generateSubjectSuggestions = async () => {
    const topic = newsletter.title || aiTopic;
    if (!topic.trim()) {
      showNotificationMessage('Please add a title or topic first', 'error');
      return;
    }

    setSubjectLoading(true);
    try {
      console.log('Generating subject lines for:', topic);
      const suggestions = await aiAPI.generateSubjects(topic, newsletter.content);
      console.log('Subject suggestions received:', suggestions);
      
      if (!suggestions || suggestions.length === 0) {
        throw new Error('No subject lines generated');
      }

      setSubjectSuggestions(suggestions);
      showNotificationMessage('Subject lines generated!', 'success');
    } catch (error: unknown) {
      console.error('Subject generation error:', error);
      
      if (error instanceof APIError) {
        if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          showNotificationMessage('Session expired. Please login again.', 'error');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
        if (error.message.includes('429') || error.message.includes('limit reached')) {
          showNotificationMessage(error.message, 'error');
          return;
        }
      }
      
      const message = error instanceof Error ? error.message : 'Failed to generate subjects';
      showNotificationMessage(message, 'error');
    } finally {
      setSubjectLoading(false);
    }
  };

  const getSmartScheduleRecommendation = async () => {
    setScheduleLoading(true);
    try {
      console.log('Getting smart schedule recommendation...');
      const recommendation = await aiAPI.getSmartSchedule();
      console.log('Smart schedule received:', recommendation);
      
      if (!recommendation || !recommendation.recommendedDay || !recommendation.recommendedTime) {
        throw new Error('Invalid schedule recommendation');
      }

      setSmartSchedule(recommendation);
      showNotificationMessage(`Best time: ${recommendation.recommendedDay} at ${recommendation.recommendedTime}`, 'success');
    } catch (error: unknown) {
      console.error('Smart schedule error:', error);
      
      if (error instanceof APIError) {
        if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          showNotificationMessage('Session expired. Please login again.', 'error');
          setTimeout(() => router.push('/login'), 2000);
          return;
        }
        if (error.message.includes('429') || error.message.includes('limit reached')) {
          showNotificationMessage(error.message, 'error');
          return;
        }
      }
      
      const message = error instanceof Error ? error.message : 'Failed to get schedule recommendation';
      showNotificationMessage(message, 'error');
    } finally {
      setScheduleLoading(false);
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
          
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
            <Button
              onClick={() => setShowAIPanel(!showAIPanel)}
              variant="secondary"
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="flex-1 sm:flex-initial min-w-[120px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-500/30 hover:border-purple-500/50"
            >
              <span className="hidden sm:inline">AI Assistant</span>
              <span className="sm:hidden">AI</span>
            </Button>
            
            <Button
              onClick={() => saveDraft(false)}
              disabled={loading}
              variant="secondary"
              leftIcon={<Save className="w-4 h-4" />}
              className="flex-1 sm:flex-initial min-w-[100px]"
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>

            <Button
              onClick={() => setShowScheduler(true)}
              disabled={scheduleLoading}
              variant="primary"
              leftIcon={scheduleLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              className="flex-1 sm:flex-initial min-w-[110px]"
            >
              {scheduleLoading ? 'Scheduling...' : 'Schedule'}
            </Button>

            <Button
              onClick={sendNow}
              disabled={sendLoading}
              variant="gradient"
              leftIcon={sendLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              className="flex-1 sm:flex-initial min-w-[100px] bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700"
            >
              {sendLoading ? 'Sending...' : 'Send'}
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
                      onKeyPress={(e) => e.key === 'Enter' && !generateLoading && aiTopic.trim() && generateAIContent()}
                      placeholder="e.g., Morning routines for productivity"
                      className="w-full px-4 py-3 bg-neutral-900/50 rounded-xl border border-white/10
                        focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/30
                        placeholder-neutral-500 text-sm text-white transition-all duration-200"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="relative group">
                        <label className="block text-xs text-neutral-400 mb-1.5 ml-1">Tone</label>
                        <select
                          value={aiTone}
                          onChange={(e) => setAiTone(e.target.value as typeof aiTone)}
                          className="w-full px-4 py-2.5 bg-neutral-900/50 rounded-lg border border-white/10 
                            focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/30 text-sm text-white
                            appearance-none cursor-pointer transition-all duration-200 hover:border-purple-500/30
                            group-hover:bg-neutral-900/70"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23a78bfa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em' }}
                        >
                          <option value="professional">Professional</option>
                          <option value="casual">Casual</option>
                          <option value="friendly">Friendly</option>
                          <option value="authoritative">Authoritative</option>
                        </select>
                      </div>

                      <div className="relative group">
                        <label className="block text-xs text-neutral-400 mb-1.5 ml-1">Length</label>
                        <select
                          value={aiLength}
                          onChange={(e) => setAiLength(e.target.value as typeof aiLength)}
                          className="w-full px-4 py-2.5 bg-neutral-900/50 rounded-lg border border-white/10 
                            focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/30 text-sm text-white
                            appearance-none cursor-pointer transition-all duration-200 hover:border-purple-500/30
                            group-hover:bg-neutral-900/70"
                          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23a78bfa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em' }}
                        >
                          <option value="short">Short (300-500 words)</option>
                          <option value="medium">Medium (500-800 words)</option>
                          <option value="long">Long (800-1200 words)</option>
                        </select>
                      </div>
                    </div>

                    <Button
                      onClick={generateAIContent}
                      disabled={generateLoading || !aiTopic.trim()}
                      variant="primary"
                      leftIcon={generateLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 relative overflow-hidden"
                    >
                      {generateLoading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                             style={{ animationDuration: '2s' }} />
                      )}
                      <span className="relative z-10">
                        {generateLoading ? 'Generating AI Content...' : 'Generate Content'}
                      </span>
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
                      disabled={improveLoading || !newsletter.content.trim()}
                      variant="secondary"
                      leftIcon={improveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      className="w-full relative overflow-hidden"
                    >
                      {improveLoading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" 
                             style={{ animationDuration: '2s' }} />
                      )}
                      <span className="relative z-10">
                        {improveLoading ? 'Improving Content...' : 'Improve Existing Content'}
                      </span>
                    </Button>

                    <Button
                      onClick={generateSubjectSuggestions}
                      disabled={subjectLoading || (!newsletter.title.trim() && !aiTopic.trim())}
                      variant="secondary"
                      leftIcon={subjectLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lightbulb className="w-4 h-4" />}
                      className="w-full relative overflow-hidden"
                    >
                      {subjectLoading && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" 
                             style={{ animationDuration: '2s' }} />
                      )}
                      <span className="relative z-10">
                        {subjectLoading ? 'Generating Subjects...' : 'Generate Subject Lines'}
                      </span>
                    </Button>

                    <Button
                      onClick={getSmartScheduleRecommendation}
                      disabled={scheduleLoading}
                      variant="secondary"
                      leftIcon={scheduleLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      className="w-full"
                    >
                      {scheduleLoading ? 'Analyzing...' : 'Get Optimal Send Time'}
                    </Button>

                    {/* Subject Suggestions */}
                    {subjectSuggestions.length > 0 && (
                      <div className="space-y-2 mt-4 p-4 bg-purple-500/5 rounded-lg border border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-purple-300">Click to use a subject line:</p>
                          <button
                            onClick={() => setSubjectSuggestions([])}
                            className="p-1 text-neutral-400 hover:text-white rounded transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-2">
                          {subjectSuggestions.map((subject, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setNewsletter({ ...newsletter, subject });
                                setSubjectSuggestions([]);
                                showNotificationMessage('Subject line applied!', 'success');
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-white bg-white/5 hover:bg-white/10 
                                rounded-lg border border-white/10 hover:border-purple-500/30 transition-all"
                            >
                              {subject}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Smart Schedule Recommendation */}
                    {smartSchedule && (
                      <div className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/30 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-purple-300 block mb-1">Optimal Send Time</span>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-purple-400" />
                              <span className="text-white font-semibold">{smartSchedule.recommendedDay}</span>
                              <Clock className="w-4 h-4 text-purple-400 ml-2" />
                              <span className="text-white font-semibold">{smartSchedule.recommendedTime}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setSmartSchedule(null)}
                            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="bg-neutral-900/30 rounded-lg p-3">
                          <p className="text-xs text-neutral-300 leading-relaxed">{smartSchedule.reasoning}</p>
                        </div>

                        {smartSchedule.alternativeSlots && smartSchedule.alternativeSlots.length > 0 && (
                          <div>
                            <p className="text-xs text-neutral-400 mb-2">Alternative times:</p>
                            <div className="grid grid-cols-1 gap-1.5">
                              {smartSchedule.alternativeSlots.slice(0, 2).map((slot, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-neutral-900/30 rounded px-2 py-1.5">
                                  <span className="text-neutral-300">{slot.day} at {slot.time}</span>
                                  <span className="text-purple-400 font-medium">{Math.round(slot.score * 100)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <Button
                          onClick={applySmartSchedule}
                          variant="primary"
                          size="sm"
                          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                        >
                          Apply This Schedule
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Schedule Modal */}
        <AnimatePresence>
          {showScheduler && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowScheduler(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md"
              >
                <GlassCard variant="strong" padding="lg" className="border-primary-500/30">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500/30 to-secondary-500/30 
                        flex items-center justify-center border border-primary-500/40">
                        <Calendar className="w-5 h-5 text-primary-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold font-display text-white">Schedule Newsletter</h2>
                        <p className="text-sm text-neutral-400">Choose when to send</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowScheduler(false)}
                      className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-200 mb-2">Select Date & Time</label>
                      <input
                        type="datetime-local"
                        id="schedule-datetime"
                        className="w-full px-4 py-3 bg-neutral-900/50 rounded-xl border border-white/10 
                          focus:border-primary-500/50 focus:ring-2 focus:ring-primary-500/30
                          text-white transition-all duration-200"
                        defaultValue={(() => {
                          const now = new Date();
                          // Round to nearest 5 minutes for cleaner display
                          const minutes = Math.ceil(now.getMinutes() / 5) * 5;
                          now.setMinutes(minutes);
                          now.setSeconds(0);
                          // Format to local datetime-local format (YYYY-MM-DDTHH:mm)
                          const year = now.getFullYear();
                          const month = String(now.getMonth() + 1).padStart(2, '0');
                          const day = String(now.getDate()).padStart(2, '0');
                          const hours = String(now.getHours()).padStart(2, '0');
                          const mins = String(now.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${mins}`;
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
                      />
                      <p className="text-xs text-neutral-500 mt-2">Newsletter will be sent at the scheduled time (your local time)</p>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={() => setShowScheduler(false)}
                        variant="secondary"
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => {
                          const input = document.getElementById('schedule-datetime') as HTMLInputElement;
                          if (input?.value) {
                            scheduleNewsletter(input.value);
                          }
                        }}
                        disabled={scheduleLoading}
                        variant="primary"
                        leftIcon={scheduleLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                        className="flex-1"
                      >
                        {scheduleLoading ? 'Scheduling...' : 'Schedule'}
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
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