import OpenAI from 'openai';
import { config } from '../config/env';

interface ContentGenerationRequest {
  topic: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative';
  length?: 'short' | 'medium' | 'long';
  targetAudience?: string;
  includeCallToAction?: boolean;
}

interface GeneratedContent {
  title: string;
  subject: string;
  content: string;
  keyTakeaways: string[];
  sources: string[];
}

interface SmartScheduleRecommendation {
  recommendedTime: string;
  recommendedDay: string;
  reasoning: string;
  alternativeSlots: { day: string; time: string; score: number }[];
}

interface EngagementData {
  openRates?: { hour: number; rate: number }[];
  clickRates?: { hour: number; rate: number }[];
  subscriberTimezones?: string[];
  historicalBestTimes?: string[];
}

class AIService {
  private openai: OpenAI | null = null;

  private getClient(): OpenAI {
    if (!this.openai) {
      const apiKey = config.get('openaiApiKey') as string | undefined;
      console.log('[AI Service] Initializing OpenAI client:', { 
        hasApiKey: !!apiKey,
        keyLength: apiKey?.length,
        keyPrefix: apiKey?.substring(0, 7)
      });
      
      if (!apiKey) {
        console.error('[AI Service] OpenAI API key not configured');
        throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY environment variable.');
      }
      this.openai = new OpenAI({ apiKey });
      console.log('[AI Service] OpenAI client initialized successfully');
    }
    return this.openai;
  }

  /**
   * Generate newsletter content using AI
   * Creates engaging, research-backed content with actionable insights
   */
  async generateContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
    console.log('[AI Service] Generating content:', {
      topic: request.topic,
      tone: request.tone,
      length: request.length,
      targetAudience: request.targetAudience
    });
    
    const client = this.getClient();
    
    const toneGuide = {
      professional: 'formal, authoritative, and industry-focused',
      casual: 'relaxed, conversational, and approachable',
      friendly: 'warm, personal, and engaging',
      authoritative: 'expert-level, data-driven, and confident'
    };

    const lengthGuide = {
      short: '300-500 words',
      medium: '500-800 words',
      long: '800-1200 words'
    };

    const tone = request.tone || 'professional';
    const length = request.length || 'medium';
    const audience = request.targetAudience || 'general audience';

    const systemPrompt = `You are an expert newsletter writer who creates engaging, human-like content backed by great research, originality, and actionable insights. 

Your writing style is ${toneGuide[tone]}.

Key principles:
1. Write like a human expert sharing valuable insights, not like AI
2. Include specific, actionable takeaways readers can implement immediately
3. Reference credible sources and research when making claims
4. Use compelling storytelling and real-world examples
5. Create urgency and value without being salesy
6. Structure content for easy scanning (headers, bullet points)
7. End with a clear call-to-action

Always provide original perspectives and avoid generic advice.`;

    const userPrompt = `Create a newsletter about: "${request.topic}"

Target audience: ${audience}
Desired length: ${lengthGuide[length]}
${request.includeCallToAction ? 'Include a compelling call-to-action at the end.' : ''}

Respond in JSON format:
{
  "title": "Compelling newsletter title",
  "subject": "Email subject line that drives opens (max 60 chars)",
  "content": "Full HTML newsletter content with proper formatting",
  "keyTakeaways": ["3-5 actionable takeaways"],
  "sources": ["List of credible sources/references mentioned"]
}`;

    try {
      // Optimized token limits - just enough to complete responses
      const tokenLimits = {
        short: 800,    // ~400-500 words + JSON structure
        medium: 1200,  // ~600-800 words + JSON structure  
        long: 1600     // ~800-1000 words + JSON structure
      };

      console.log('[AI Service] Making OpenAI API call...');

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: tokenLimits[length]
      });

      const result = response.choices[0]?.message?.content;
      console.log('[AI Service] OpenAI response received:', {
        hasResult: !!result,
        resultLength: result?.length
      });
      
      if (!result) {
        console.error('[AI Service] No content generated from OpenAI');
        throw new Error('No content generated');
      }

      const parsed = JSON.parse(result) as GeneratedContent;
      console.log('[AI Service] Content parsed successfully:', {
        hasTitle: !!parsed.title,
        hasContent: !!parsed.content,
        contentLength: parsed.content?.length
      });
      
      // Format the content as HTML if it isn't already
      if (!parsed.content.includes('<')) {
        parsed.content = this.formatAsHTML(parsed.content);
      }

      return parsed;
    } catch (error) {
      console.error('AI content generation error:', error);
      throw new Error('Failed to generate content. Please try again.');
    }
  }

  /**
   * Improve existing newsletter content
   */
  async improveContent(existingContent: string, instructions?: string): Promise<string> {
    const client = this.getClient();

    const systemPrompt = `You are an expert newsletter editor. Your job is to improve existing content while maintaining its core message. 

Focus on:
1. Making the writing more engaging and human
2. Adding actionable insights
3. Improving flow and readability
4. Strengthening the opening hook
5. Making the call-to-action more compelling`;

    const userPrompt = `Improve this newsletter content:

${existingContent}

${instructions ? `Additional instructions: ${instructions}` : ''}

Return only the improved HTML content, nothing else.`;

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
        max_tokens: 600  // Reduced - just improved content, no JSON overhead
      });

      return response.choices[0]?.message?.content || existingContent;
    } catch (error) {
      console.error('AI content improvement error:', error);
      throw new Error('Failed to improve content. Please try again.');
    }
  }

  /**
   * Generate subject line suggestions
   */
  async generateSubjectLines(topic: string, content?: string): Promise<string[]> {
    const client = this.getClient();

    const userPrompt = `Generate 5 compelling email subject lines for a newsletter about: "${topic}"

${content ? `Content preview: ${content.substring(0, 500)}...` : ''}

Requirements:
- Maximum 60 characters each
- Create curiosity and urgency
- Avoid spam trigger words
- Mix different styles (question, number, how-to, etc.)

Return as JSON array: ["subject1", "subject2", "subject3", "subject4", "subject5"]`;

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 250  // 5 subject lines ~150 tokens + JSON structure
      });

      const result = response.choices[0]?.message?.content;
      if (!result) return [];

      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : parsed.subjects || parsed.subject_lines || [];
    } catch (error) {
      console.error('AI subject generation error:', error);
      throw new Error('Failed to generate subject lines.');
    }
  }

  /**
   * Smart scheduling - analyze engagement data and recommend optimal send times
   */
  async getSmartScheduleRecommendation(engagementData?: EngagementData): Promise<SmartScheduleRecommendation> {
    const client = this.getClient();

    // Default engagement patterns if no data provided
    const defaultPatterns = `
Based on industry research:
- Tuesdays and Thursdays typically have highest open rates
- Best times: 10am, 2pm, and 8pm local time
- Avoid Mondays (inbox overload) and Fridays (weekend mindset)
- B2B: Weekday mornings perform best
- B2C: Evenings and weekends can work well`;

    const contextData = engagementData ? `
Historical data:
- Open rates by hour: ${JSON.stringify(engagementData.openRates || [])}
- Click rates by hour: ${JSON.stringify(engagementData.clickRates || [])}
- Subscriber timezones: ${(engagementData.subscriberTimezones || []).join(', ')}
- Previous best times: ${(engagementData.historicalBestTimes || []).join(', ')}
` : defaultPatterns;

    const userPrompt = `Analyze this engagement data and recommend the optimal time to send a newsletter:

${contextData}

Provide recommendation in JSON format:
{
  "recommendedTime": "HH:MM format (24h)",
  "recommendedDay": "Day of week",
  "reasoning": "Brief explanation of why this time is optimal",
  "alternativeSlots": [
    { "day": "Day", "time": "HH:MM", "score": 0.0-1.0 }
  ]
}

Consider timezone diversity and maximize engagement potential.`;

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 300  // Schedule recommendation + alternatives + JSON
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No recommendation generated');
      }

      return JSON.parse(result) as SmartScheduleRecommendation;
    } catch (error) {
      console.error('AI scheduling error:', error);
      // Return sensible defaults on error
      return {
        recommendedTime: '10:00',
        recommendedDay: 'Tuesday',
        reasoning: 'Based on general industry best practices for newsletter engagement.',
        alternativeSlots: [
          { day: 'Thursday', time: '10:00', score: 0.9 },
          { day: 'Tuesday', time: '14:00', score: 0.85 },
          { day: 'Wednesday', time: '10:00', score: 0.8 }
        ]
      };
    }
  }

  /**
   * Generate a catchy title from content
   */
  async generateTitle(content: string): Promise<string> {
    const client = this.getClient();

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Generate a compelling, catchy title for this newsletter content (max 80 characters):

${content.substring(0, 1000)}

Return only the title, nothing else.`
        }],
        temperature: 0.8,
        max_tokens: 30  // Just a title, ~15-25 tokens
      });

      return response.choices[0]?.message?.content?.trim() || 'Untitled Newsletter';
    } catch (error) {
      console.error('AI title generation error:', error);
      throw new Error('Failed to generate title.');
    }
  }

  /**
   * Format plain text as HTML
   */
  private formatAsHTML(text: string): string {
    const paragraphs = text.split('\n\n');
    const formatted = paragraphs.map(p => {
      // Check for headers (lines starting with # or all caps short lines)
      if (p.startsWith('# ')) {
        return `<h1 style="color: #1a1a2e; margin-bottom: 16px;">${p.replace('# ', '')}</h1>`;
      }
      if (p.startsWith('## ')) {
        return `<h2 style="color: #1a1a2e; margin-bottom: 12px;">${p.replace('## ', '')}</h2>`;
      }
      if (p.startsWith('### ')) {
        return `<h3 style="color: #1a1a2e; margin-bottom: 10px;">${p.replace('### ', '')}</h3>`;
      }
      
      // Check for bullet lists
      if (p.includes('\n- ') || p.startsWith('- ')) {
        const items = p.split('\n- ').filter(Boolean);
        const listItems = items.map(item => `<li style="margin-bottom: 8px;">${item.replace(/^- /, '')}</li>`).join('');
        return `<ul style="padding-left: 20px; margin-bottom: 16px;">${listItems}</ul>`;
      }

      // Regular paragraph
      return `<p style="color: #333; line-height: 1.6; margin-bottom: 16px;">${p}</p>`;
    }).join('\n');

    return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">${formatted}</div>`;
  }
}

// Export singleton instance
export const aiService = new AIService();
export type { ContentGenerationRequest, GeneratedContent, SmartScheduleRecommendation, EngagementData };
