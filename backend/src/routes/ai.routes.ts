import express, { Request, Response, NextFunction } from 'express';
import { aiController } from '../controllers/ai.controller';
import { rateLimiters } from '../middleware/rateLimiter.middleware';

const router = express.Router();

// Apply AI-specific rate limiting (10 requests per hour for free tier)
router.use(rateLimiters.ai);

// All AI routes are protected (added in server.ts via protectedRouter)

// Generate newsletter content
router.post('/generate-content', (req: Request, res: Response, next: NextFunction) => aiController.generateContent(req, res, next));

// Improve existing content
router.post('/improve-content', (req: Request, res: Response, next: NextFunction) => aiController.improveContent(req, res, next));

// Generate subject line suggestions
router.post('/generate-subjects', (req: Request, res: Response, next: NextFunction) => aiController.generateSubjects(req, res, next));

// Get smart schedule recommendation
router.post('/smart-schedule', (req: Request, res: Response, next: NextFunction) => aiController.getSmartSchedule(req, res, next));

// Generate title from content
router.post('/generate-title', (req: Request, res: Response, next: NextFunction) => aiController.generateTitle(req, res, next));

export default router;
