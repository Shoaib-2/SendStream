import express, { Request, Response, NextFunction } from 'express';
import { aiController } from '../controllers/ai.controller';
import { rateLimiters } from '../middleware/rateLimiter.middleware';
import { checkAIUsageLimit, getAIUsageStats } from '../middleware/aiUsage.middleware';

const router = express.Router();

// Apply AI-specific rate limiting (10 requests per hour for free tier)
router.use(rateLimiters.ai);

// All AI routes are protected (added in server.ts via protectedRouter)

// AI Usage Statistics
router.get('/usage', (req: Request, res: Response) => getAIUsageStats(req, res));

// Generate newsletter content (5 per day limit)
router.post('/generate-content', checkAIUsageLimit('generate_content'), (req: Request, res: Response, next: NextFunction) => aiController.generateContent(req, res, next));

// Improve existing content (5 per day limit)
router.post('/improve-content', checkAIUsageLimit('improve_content'), (req: Request, res: Response, next: NextFunction) => aiController.improveContent(req, res, next));

// Generate subject line suggestions (5 per day limit)
router.post('/generate-subjects', checkAIUsageLimit('subject_lines'), (req: Request, res: Response, next: NextFunction) => aiController.generateSubjects(req, res, next));

// Get smart schedule recommendation (5 per day limit)
router.post('/smart-schedule', checkAIUsageLimit('smart_schedule'), (req: Request, res: Response, next: NextFunction) => aiController.getSmartSchedule(req, res, next));

// Generate title from content (5 per day limit)
router.post('/generate-title', checkAIUsageLimit('generate_title'), (req: Request, res: Response, next: NextFunction) => aiController.generateTitle(req, res, next));

export default router;
