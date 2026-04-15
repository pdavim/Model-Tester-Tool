import Redis from 'ioredis';
import { Logger } from '../infra/Logging';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  Logger.info('Successfully connected to Redis');
});

redis.on('error', (err) => {
  Logger.error('Redis Connection Error:', err);
});
