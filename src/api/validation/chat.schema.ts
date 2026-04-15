import { z } from 'zod';

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string().min(1),
    z.array(z.object({
      type: z.string(),
      text: z.string().optional(),
      image_url: z.object({ url: z.string() }).optional()
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
  // Keys are optional in the payload because they might be in env vars
  openRouterKey: z.string().optional(),
  hfApiKey: z.string().optional(),
});

export type ChatPayload = z.infer<typeof ChatPayloadSchema>;
