import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { ChatService } from '../../services/ChatService';
import { ChatPayloadSchema } from '../validation/chat.schema';
import { Logger } from '../../infra/Logging';

export class WebSocketGateway {
  private wss: WebSocketServer;
  private messageCounts: Map<WebSocket, { count: number; lastReset: number }> = new Map();
  private readonly MAX_MESSAGES_PER_MIN = 10;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws/chat' });
    this.init();
  }

  private init() {
    this.wss.on('connection', (ws: WebSocket) => {
      Logger.info('New WebSocket connection established');

      ws.on('message', async (data: string) => {
        // Rate Limiting Logic
        const now = Date.now();
        const clientStats = this.messageCounts.get(ws) || { count: 0, lastReset: now };
        
        if (now - clientStats.lastReset > 60000) {
          clientStats.count = 1;
          clientStats.lastReset = now;
        } else {
          clientStats.count++;
        }
        this.messageCounts.set(ws, clientStats);

        if (clientStats.count > this.MAX_MESSAGES_PER_MIN) {
          ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded. Max 10 messages per minute.' }));
          return;
        }

        try {
          const payload = JSON.parse(data.toString());
          
          // Validate payload using Zod
          const validatedPayload = ChatPayloadSchema.parse(payload);
          
          Logger.info(`WS Chat Request for model: ${validatedPayload.model}`);

          // Set up AbortController for this specific WS request
          const abortController = new AbortController();
          
      ws.on('close', () => {
        abortController.abort();
        this.messageCounts.delete(ws);
        Logger.info('WS Connection closed, aborting stream');
      });

          const response = await ChatService.handleChat(validatedPayload, {
            signal: abortController.signal
          });

          if (!response.body) {
            throw new Error('No response body from provider');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            
            // Forward chunks to client
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'chunk', content: chunk }));
            }
          }

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'done' }));
          }

        } catch (error: any) {
          Logger.error('WebSocket Chat Error:', error);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: error.message || 'Internal server error' 
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
