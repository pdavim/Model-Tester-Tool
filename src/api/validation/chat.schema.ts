import { z } from 'zod';
import { config } from '../../config/env';

const allowedHosts = config.ALLOWED_IMAGE_HOSTS.split(',').map(h => h.trim());

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string().min(1),
    z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
      image_url: z.object({ url: z.string().url() })
        .refine(v => {
          try {
            const hostname = new URL(v.url).hostname;
            return allowedHosts.some(h => hostname === h || hostname.endsWith(`.${h}`));
          } catch {
            return false;
          }
        }, { message: `Image host not allowed. Whitelist: ${config.ALLOWED_IMAGE_HOSTS}` })
        .optional()
    }))
  ]),
});

export const ChatPayloadSchema = z.object({
  model: z.string().min(1),
  messages: z.array(MessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  top_p: z.number().min(0).max(1).optional().default(1),
  max_tokens: z.number().int().positive().optional().default(2048),
  frequency_penalty: z.number().min(-2).max(2).optional().default(0),
  presence_penalty: z.number().min(-2).max(2).optional().default(0),
  stream: z.boolean().optional().default(false),
});

export type ChatPayload = z.infer<typeof ChatPayloadSchema>;
