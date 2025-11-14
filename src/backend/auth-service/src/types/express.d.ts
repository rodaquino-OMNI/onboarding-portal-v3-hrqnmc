// Type definitions for Express request extensions

import { User } from '../models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        userId: string;
        role: string;
        mfaVerified?: boolean;
        permissions?: string[];
        sessionId?: string;
      };
    }
  }
}

export {};
