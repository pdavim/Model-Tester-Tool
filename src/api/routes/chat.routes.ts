import { Router } from 'express';
import { chatService } from '../../services/ChatService';
import { ChatPayloadSchema } from '../validation/chat.schema';
import { Logger } from '../../infra/Logging';

const router = Router();

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Execute a chat completion request with streaming support
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [model, messages]
 *             properties:
 *               model:
 *                 type: string
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *               stream:
 *                 type: boolean
 *               temperature:
 *                 type: number
 *     responses:
 *       200:
 *         description: Chat completion response or text/event-stream
 */
router.post('/chat', async (req, res, next) => {
  try {
    const payload = ChatPayloadSchema.parse(req.body);
    const response = await chatService.handleChat(payload);
    
    if (payload.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const reader = (response.body as any).getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      const data = await response.json();
      res.status(response.status).json(data);
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/hf/chat:
 *   post:
 *     summary: Backward compatible Hugging Face chat completion
 *     tags: [Chat]
 */
router.post('/hf/chat', async (req, res, next) => {
  try {
    // Inject hfApiKey into the logic if it's there
    const payload = ChatPayloadSchema.parse({
      ...req.body,
      hfApiKey: req.body.hfApiKey || req.headers['x-hf-key']
    });
    
    const response = await chatService.handleChat(payload);
    
    if (payload.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const reader = (response.body as any).getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      const data = await response.json();
      res.status(response.status).json(data);
    }
  } catch (error) {
    next(error);
  }
});

export default router;
