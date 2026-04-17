import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3767),
  APP_URL: z.string().url().default('http://localhost:3767'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  OPENROUTER_API_KEY: z.string().optional(),
  HF_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['info', 'debug', 'warn', 'error']).default('info'),
  JWT_SECRET: z.string().default('super-secret-key-change-in-production'),
  RATE_LIMIT_CHAT: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  ALLOWED_IMAGE_HOSTS: z.string().default('innovaive.com'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const config = parsed.data;
export type Config = z.infer<typeof envSchema>;
