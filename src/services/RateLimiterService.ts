import { redis } from '../lib/redis';
import { Logger } from '../infra/Logging';

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  retryAfter: number;
}

/**
 * Shared Rate Limiter Service using Redis and Lua scripts for atomicity.
 * Implements a sliding window counter.
 */
export class RateLimiterService {
  /**
   * Check if a request exceeds the rate limit.
   * @param id Unique identifier for the rate limit (e.g., userId or IP)
   * @param bucket Category (e.g., 'http_api', 'ws_chat')
   * @param limit Max requests allowed in the window
   * @param windowSec Window size in seconds
   */
  static async checkLimit(
    id: string,
    bucket: string,
    limit: number,
    windowSec: number
  ): Promise<RateLimitResult> {
    const key = `rate_limit:${bucket}:${id}`;
    const now = Date.now();
    const windowMs = windowSec * 1000;
    const windowStart = now - windowMs;

    try {
      // Lua script for sliding window rate limiting
      // ARGV[1] = windowStart, ARGV[2] = now, ARGV[3] = windowMs, ARGV[4] = limit
      const script = `
        redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
        local count = redis.call('ZCARD', KEYS[1])
        if count < tonumber(ARGV[4]) then
          redis.call('ZADD', KEYS[1], ARGV[2], ARGV[2])
          redis.call('PEXPIRE', KEYS[1], ARGV[3])
          return {1, tonumber(ARGV[4]) - count - 1, 0}
        else
          local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
          local retryAfter = 0
          if #oldest > 0 then
            retryAfter = math.ceil((tonumber(oldest[2]) + tonumber(ARGV[3]) - tonumber(ARGV[2])) / 1000)
          end
          return {0, 0, retryAfter}
        end
      `;

      const result = (await redis.eval(
        script,
        1,
        key,
        windowStart.toString(),
        now.toString(),
        windowMs.toString(),
        limit.toString()
      )) as [number, number, number];

      const [allowed, remaining, retryAfter] = result;

      if (!allowed) {
        Logger.warn(`Rate limit exceeded for ${key}. Retry after ${retryAfter}s`);
      }

      return {
        success: !!allowed,
        remaining,
        retryAfter,
      };
    } catch (error) {
      Logger.error('RateLimiterService Error:', error);
      // Fallback: Allow request if Redis is down (fail-open)
      return { success: true, remaining: 1, retryAfter: 0 };
    }
  }
}
