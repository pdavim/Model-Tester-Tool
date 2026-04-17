import { WebSocketServer, WebSocket } from 'ws';
import { Server, IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { ChatService } from '../../services/ChatService';
import { ChatPayloadSchema } from '../validation/chat.schema';
import { RateLimiterService } from '../../services/RateLimiterService';
import { Logger } from '../../infra/Logging';
import { config } from '../../config/env';

export class WebSocketGateway {
  private wss: WebSocketServer;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/chat' });
    this.init();
  }

  private init() {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const token = url.searchParams.get('token');
      let userId = 'anonymous';

      // 1. Authentication
      try {
        if (!token) throw new Error('Missing token');
        const decoded = jwt.verify(token, config.JWT_SECRET) as { sub: string };
        userId = decoded.sub;
        Logger.info(`WS Auth Successful: ${userId}`);
      } catch (error) {
        Logger.warn(`WS Auth Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
        ws.close(4001);
        return;
      }

      ws.on('message', async (data: string) => {
        // 2. Unified Rate Limiting
        const rlResult = await RateLimiterService.checkLimit(
          userId,
          'ws_chat',
          10, // Max 10 messages per minute
          60
        );

        if (!rlResult.success) {
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Rate limit exceeded', 
            retryAfterMs: rlResult.retryAfter * 1000 
          }));
          return;
        }

        try {
          const payload = JSON.parse(data.toString());
          const validatedPayload = ChatPayloadSchema.parse(payload);
          
          Logger.info(`WS Chat Request - User: ${userId}, Model: ${validatedPayload.model}`);

          const abortController = new AbortController();
          
          const closeHandler = () => {
            abortController.abort();
            Logger.info(`WS Connection closed for ${userId}, aborting stream`);
          };

          ws.on('close', closeHandler);

          const response = await ChatService.handleChat(validatedPayload, {
            signal: abortController.signal
          });

          if (!response.body) {
            throw new Error('No response body from provider');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                  type: 'chunk', 
                  content: decoder.decode(value, { stream: true }) 
                }));
              }
            }

            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'done' }));
            }
          } finally {
            reader.releaseLock();
            ws.off('close', closeHandler);
          }

        } catch (error: any) {
          Logger.error('WebSocket Chat Error:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: error.name === 'AbortError' ? 'Request aborted' : (error.message || 'Internal server error')
            }));
          }
        }
      });

      ws.on('error', (error) => {
        Logger.error('WebSocket Error:', error);
      });
    });
  }
}
