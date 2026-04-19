import { Model } from '../types';
import { ENDPOINTS } from '../shared/constants';
import { useAuthStore } from '../store/useAuthStore';

export class ApiService {
  /**
   * Fetches models from the consolidated server endpoint.
   */
  static async fetchModels(): Promise<Model[]> {
    const token = useAuthStore.getState().token;
    const response = await fetch(ENDPOINTS.MODELS, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error('Session expired. Please re-authenticate.');
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Search Hugging Face models via server proxy.
   */
  static async searchHFHub(query: string, hfApiKey?: string): Promise<Model[]> {
    if (!query.trim() || query.length < 3) return [];
    
    const token = useAuthStore.getState().token;
    const url = new URL(ENDPOINTS.HF_MODELS, window.location.origin);
    url.searchParams.append('search', query);

    const response = await fetch(url.toString(), {
      headers: {
        ...(hfApiKey ? { 'x-hf-key': hfApiKey } : {}),
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 401) {
      useAuthStore.getState().logout();
      return [];
    }

    if (!response.ok) return [];
    return await response.json();
  }

  /**
   * Generalized send message handler with streaming support.
   */
  static async sendMessage(
    payload: any,
    endpoint: string,
    options: {
      onStream?: (chunk: string, usage?: any) => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<any> {
    const token = useAuthStore.getState().token;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Request-Id': crypto.randomUUID(), 
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
      signal: options.signal,
    });

    if (response.status === 401) {
      useAuthStore.getState().logout();
      throw new Error('Session expired');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    // Handle Streaming
    if (payload.stream && response.body && options.onStream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          const message = line.replace(/^data: /, '');
          if (message === '[DONE]') break;
          try {
            const parsed = JSON.parse(message);
            const content = parsed.choices[0]?.delta?.content || '';
            options.onStream(content, parsed.usage);
          } catch (e) {
            // Log parse errors but don't break the stream
            console.debug('Failed to parse SSE line:', line);
          }
        }
      }
      return;
    }

    // Handle Blob (Audio/Video/Image)
    const contentType = response.headers.get('content-type');
    if (contentType && (contentType.includes('audio') || contentType.includes('video') || contentType.includes('image'))) {
      return await response.blob();
    }

    // Handle JSON
    return await response.json();
  }
}
