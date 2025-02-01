// backend/src/controllers/newsletter.controller.ts
import { Request, Response, NextFunction } from 'express';
import Newsletter from '../models/Newsletter';
import { APIError } from '../utils/errors';
import { EmailService } from '../services/email'; 

export const getNewsletters = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newsletters = await Newsletter.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: newsletters });
  } catch (error) {
    next(error);
  }
};

export const createNewsletter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newsletter = await Newsletter.create(req.body);
    res.status(201).json({ status: 'success', data: newsletter });
  } catch (error) {
    next(error);
  }
};

export const updateNewsletter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newsletter = await Newsletter.findByIdAndUpdate(
      req.params.id, 
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!newsletter) throw new APIError(404, 'Newsletter not found');
    res.json({ status: 'success', data: newsletter });
  } catch (error) {
    next(error);
  }
};

const emailService = new EmailService({
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT!),
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASSWORD!
    }
});

export const sendNewsletter = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newsletter = await Newsletter.findById(req.params.id);
      if (!newsletter) throw new APIError(404, 'Newsletter not found');
   
      const result = await emailService.sendNewsletter(newsletter);
      
      newsletter.status = 'sent';
      newsletter.sentDate = new Date();
      await newsletter.save();
   
      res.json({ 
        status: 'success', 
        data: { ...newsletter.toJSON(), sentTo: result.sent } 
      });
    } catch (error) {
      next(error);
    }
   };