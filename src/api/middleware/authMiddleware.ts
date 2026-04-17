import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/env';
import { Logger } from '../../infra/Logging';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    scopes: string[];
  };
}

/**
 * Middleware to validate JWT from Authorization header.
 */
export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    Logger.warn('Missing or invalid Authorization header');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string; scopes?: string[] };
    
    req.user = {
      id: decoded.sub,
      scopes: decoded.scopes || [],
    };

    Logger.info(`User authenticated: ${req.user.id}`);
    next();
  } catch (error) {
    Logger.error('JWT Verification Failed:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Higher-order function to require specific scopes.
 */
export const requireScope = (scope: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.scopes.includes(scope)) {
      Logger.warn(`User ${req.user.id} lacks required scope: ${scope}`);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
