import { ProviderFactory } from './providers/ProviderFactory';
import { ChatPayload } from '../api/validation/chat.schema';
import { chatRequestsCounter, chatStreamBytesCounter, modelFetchLatencyHistogram } from '../infra/Metrics';
import { Logger } from '../infra/Logging';
import { PROVIDERS } from '../shared/constants';
import { redis } from '../lib/redis';

export class ChatService {
  /**
   * Routes a chat request to the appropriate provider
   */
  async handleChat(payload: ChatPayload, signal?: AbortSignal): Promise<Response> {
    const provider = ProviderFactory.getProviderByModel(payload.model);
    
    // Increment metrics
    chatRequestsCounter.inc({ 
      provider: provider.name, 
      model: payload.model, 
      status: 'initiated' 
    });

    try {
      const response = await provider.chat(payload, { signal });
      
      chatRequestsCounter.inc({ 
        provider: provider.name, 
        model: payload.model, 
        status: 'success' 
      });

      return response as Response;
    } catch (error: any) {
      chatRequestsCounter.inc({ 
        provider: provider.name, 
        model: payload.model, 
        status: 'error' 
      });
      Logger.error(`ChatService Error [${provider.name}]: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetches models from all supported providers with caching
   */
  async getAggregatedModels(): Promise<any[]> {
    const CACHE_KEY = 'aggregated_models';
    const CACHE_TTL = 3600; // 1 hour

    // Try cache first
    const cached = await redis.get(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }

    const start = Date.now();
    const results = await Promise.allSettled([
      this.fetchWithMetrics(PROVIDERS.OPENROUTER),
      this.fetchWithMetrics(PROVIDERS.HUGGINGFACE),
    ]);

    const models = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Cache results
    await redis.setex(CACHE_KEY, CACHE_TTL, JSON.stringify(models));
    
    const duration = Date.now() - start;
    Logger.info(`Aggregated ${models.length} models in ${duration}ms`);

    return models;
  }

  private async fetchWithMetrics(providerName: string): Promise<any[]> {
    const timer = modelFetchLatencyHistogram.startTimer({ provider: providerName });
    try {
      const provider = ProviderFactory.getProvider(providerName);
      const models = await provider.getModels();
      timer();
      return models;
    } catch (error: any) {
      Logger.error(`Failed to fetch models for ${providerName}: ${error.message}`);
      return [];
    }
  }
}

export const chatService = new ChatService();
