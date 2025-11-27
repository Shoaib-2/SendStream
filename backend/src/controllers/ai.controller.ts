import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/ai.service';
import { ValidationError } from '../utils/customErrors';

class AIController {
  /**
   * Generate newsletter content using AI
   * POST /api/ai/generate-content
   */
  async generateContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('[AI Controller] Generate content request:', {
        userId: req.user?._id?.toString(),
        hasUser: !!req.user,
        body: req.body
      });
      
      const { topic, tone, length, targetAudience, includeCallToAction } = req.body;

      if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        throw new ValidationError('Topic is required');
      }

      if (topic.length > 500) {
        throw new ValidationError('Topic must be less than 500 characters');
      }

      const content = await aiService.generateContent({
        topic: topic.trim(),
        tone: tone || 'professional',
        length: length || 'medium',
        targetAudience: targetAudience || undefined,
        includeCallToAction: includeCallToAction ?? true
      });

      console.log('[AI Controller] Content generated successfully');

      res.status(200).json({
        status: 'success',
        data: content
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Improve existing newsletter content
   * POST /api/ai/improve-content
   */
  async improveContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { content, instructions } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new ValidationError('Content is required');
      }

      if (content.length > 10000) {
        throw new ValidationError('Content must be less than 10,000 characters');
      }

      const improvedContent = await aiService.improveContent(content.trim(), instructions);

      res.status(200).json({
        status: 'success',
        data: { content: improvedContent }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate subject line suggestions
   * POST /api/ai/generate-subjects
   */
  async generateSubjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { topic, content } = req.body;

      if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
        throw new ValidationError('Topic is required');
      }

      const subjects = await aiService.generateSubjectLines(topic.trim(), content);

      res.status(200).json({
        status: 'success',
        data: { subjects }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get smart schedule recommendation
   * POST /api/ai/smart-schedule
   */
  async getSmartSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { engagementData } = req.body;

      const recommendation = await aiService.getSmartScheduleRecommendation(engagementData);

      res.status(200).json({
        status: 'success',
        data: recommendation
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate a title from content
   * POST /api/ai/generate-title
   */
  async generateTitle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { content } = req.body;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        throw new ValidationError('Content is required');
      }

      const title = await aiService.generateTitle(content.trim());

      res.status(200).json({
        status: 'success',
        data: { title }
      });
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AIController();
