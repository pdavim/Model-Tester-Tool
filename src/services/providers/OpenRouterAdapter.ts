import { IProvider } from './IProvider';
import { ChatPayload } from '../../api/validation/chat.schema';
import { Logger } from '../../infra/Logging';
import { PROVIDERS } from '../../shared/constants';
import { RetryUtility } from '../../utils/RetryUtility';
import { PromptNormalizer } from '../../utils/PromptNormalizer';
import { config } from '../../config/env';

export class OpenRouterAdapter implements IProvider {
  readonly name = PROVIDERS.OPENROUTER;

  async chat(payload: ChatPayload, options?: { signal?: AbortSignal }): Promise<Response> {
    const key = config.OPENROUTER_API_KEY;
    
    if (!key) {
      throw new Error('OpenRouter API Key is missing on server');
    }

    const isFreeModel = payload.model.includes(':free');
    
    // Normalize messages for picky models like Gemma and Qwen
    const normalizedMessages = PromptNormalizer.normalize(payload.model, payload.messages);

    const response = await RetryUtility.fetchWithRetry(

      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3767',
          'X-Title': 'Model Tester Tool',
        },
        body: JSON.stringify({
          model: payload.model,
          messages: normalizedMessages,
          temperature: payload.temperature,
          top_p: payload.top_p,
          max_tokens: payload.max_tokens,
          stream: payload.stream,
        }),
        signal: options?.signal,
      },
      {
        maxRetries: isFreeModel ? 7 : 3,
        statusSpecificMaxRetries: isFreeModel ? { 429: 8, 500: 3 } : { 429: 5 },
        retryOnStatusCodes: isFreeModel ? [429, 500, 502, 503, 504] : [429, 500, 502, 503, 504],
      }
    );


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const sanitizedError = {
        message: errorData.error?.message || 'Unknown Error',
        code: errorData.error?.code,
        status: response.status
      };
      
      Logger.error(`OpenRouter API Error: ${response.status}`, { sanitizedError });
      throw new Error(sanitizedError.message || `OpenRouter API returned ${response.status}`);
    }

    return response;
  }

  async getModels(): Promise<any[]> {
    const response = await RetryUtility.fetchWithRetry('https://openrouter.ai/api/v1/models', {}, { maxRetries: 2 });
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenRouter models: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  }
}

