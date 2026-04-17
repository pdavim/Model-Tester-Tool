import { Request, Response, NextFunction } from 'express';
import { RateLimiterService } from '../../services/RateLimiterService';
import { Logger } from '../../infra/Logging';
import { config } from '../../config/env';

/**
 * Unified rate limiter middleware for Express.
 * Leverages RateLimiterService for Redis-backed sliding window counting.
 */
export const apiRateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const identifier = req.ip || 'anonymous';
  
  const result = await RateLimiterService.checkLimit(
    identifier,
    'http_api',
    config.RATE_LIMIT_CHAT,
    Math.ceil(config.RATE_LIMIT_WINDOW_MS / 1000)
  );

  if (!result.success) {
    Logger.warn(`HTTP Rate limit exceeded for IP: ${identifier}`);
    res.setHeader('Retry-After', result.retryAfter.toString());
    return res.status(429).json({
      error: {
        message: 'Too many requests, please try again later.',
        retryAfterMs: result.retryAfter * 1000
      }
    });
  }

  res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
  next();
};
