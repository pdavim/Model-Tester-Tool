import { IProvider } from './IProvider';
import { ChatPayload } from '../../api/validation/chat.schema';
import { Logger } from '../../infra/Logging';
import { PROVIDERS } from '../../shared/constants';

export class OpenRouterAdapter implements IProvider {
  readonly name = PROVIDERS.OPENROUTER;

  constructor(private config: { apiKey?: string }) {}

  async chat(payload: ChatPayload, options?: { signal?: AbortSignal }): Promise<Response> {
    const key = payload.openRouterKey || this.config.apiKey || process.env.OPENROUTER_API_KEY;
    
    if (!key) {
      throw new Error('OpenRouter API Key is missing');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3767',
        'X-Title': 'Model Tester Tool',
      },
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages,
        temperature: payload.temperature,
        top_p: payload.top_p,
        max_tokens: payload.max_tokens,
        stream: payload.stream,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Sanitize: only log useful error bits, not the whole potentially sensitive object
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
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) {
      throw new Error(`Failed to fetch OpenRouter models: ${response.status}`);
    }
    const data = await response.json();
    return data.data || [];
  }
}
