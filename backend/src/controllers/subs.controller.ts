import { Request, Response, NextFunction } from 'express';
import Subscriber from '../models/Subscriber';
import { APIError } from '../utils/errors';

export const getSubscribers = async (req: Request, res: Response, next: NextFunction) => {
 try {
   const subscribers = await Subscriber.find().select('-__v');
   res.json({ status: 'success', data: subscribers });
 } catch (error) {
   next(error);
 }
};

export const createSubscriber = async (req: Request, res: Response, next: NextFunction) => {
 try {
   const { email, name } = req.body;

   if (!email || !name) {
     throw new APIError(400, 'Email and name are required');
   }

   const existingSubscriber = await Subscriber.findOne({ email });
   if (existingSubscriber) {
     throw new APIError(409, 'Email already exists');
   }

   const subscriber = await Subscriber.create(req.body);
   res.status(201).json({ status: 'success', data: subscriber });
 } catch (error) {
   next(error);
 }
};

export const deleteSubscriber = async (req: Request, res: Response, next: NextFunction) => {
 try {
   const { id } = req.params;
   const subscriber = await Subscriber.findById(id);

   if (!subscriber) {
     throw new APIError(404, 'Subscriber not found');
   }

   await subscriber.deleteOne();
   res.status(204).send();
 } catch (error) {
   next(error);
 }
};