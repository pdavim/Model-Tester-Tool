import { IProvider } from './IProvider';
import { ChatPayload } from '../../api/validation/chat.schema';
import { Logger } from '../../infra/Logging';
import { PROVIDERS } from '../../shared/constants';
import { RetryUtility } from '../../utils/RetryUtility';
import { PromptNormalizer } from '../../utils/PromptNormalizer';
import { config } from '../../config/env';

export class HuggingFaceAdapter implements IProvider {
  readonly name = PROVIDERS.HUGGINGFACE;

  async chat(payload: ChatPayload, options?: { signal?: AbortSignal }): Promise<Response> {
    const key = config.HF_KEY;
    
    if (!key) {
      throw new Error('Hugging Face API Key is missing on server');
    }

    // Modern HF Inference Router endpoint
    const url = `https://api-inference.huggingface.co/models/${payload.model}/v1/chat/completions`;

    // Normalize messages for picky models like Gemma and Qwen
    const normalizedMessages = PromptNormalizer.normalize(payload.model, payload.messages);

    const response = await RetryUtility.fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
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
        maxRetries: 3,
        // HF sometimes returns 503 when model is loading
        retryOnStatusCodes: [429, 500, 502, 503, 504],
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const sanitizedError = {
        message: errorData.error || 'Unknown Error',
        status: response.status,
        type: typeof errorData.error === 'string' ? 'string' : 'object'
      };

      Logger.error(`Hugging Face API Error: ${response.status}`, { sanitizedError });
      throw new Error(sanitizedError.message || `Hugging Face API returned ${response.status}`);
    }

    return response;
  }

  async getModels(): Promise<any[]> {
    const response = await RetryUtility.fetchWithRetry(
      'https://huggingface.co/api/models?pipeline_tag=text-generation&sort=downloads&direction=-1&limit=50',
      {},
      { maxRetries: 2 }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Hugging Face models: ${response.status}`);
    }
    const data = await response.json();
    return data.map((m: any) => ({
      id: m.modelId,
      name: m.modelId,
      provider: PROVIDERS.HUGGINGFACE
    }));
  }
}

