import { Express } from 'express-serve-static-core'

// Declare global namespace to modify existing Express types
declare global {
  // Extend Express namespace
  namespace Express {
    // Extend the Request interface
    interface Request {
      // Add user property that might be undefined
      user?: {
        _id: string;      // MongoDB user ID
        email: string;    // User's email
        role: string;     // User's role (e.g., 'admin', 'user')
      }
    }
  }
}