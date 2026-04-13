import { Model, Message, Attachment } from '@/types';

export class ApiService {
  static async fetchModels(hfApiKey?: string): Promise<Model[]> {
    const orResponse = await fetch('/api/models');
    const orData = await orResponse.json();
    const orModels = (orData.data || []).map((m: any) => ({ ...m, provider: 'openrouter' }));

    let hfModels: Model[] = [];
    try {
      const hfResponse = await fetch('/api/hf/models', {
        headers: hfApiKey ? { 'x-hf-key': hfApiKey } : {}
      });
      if (hfResponse.ok) {
        hfModels = await hfResponse.json();
      }
    } catch (e) {
      console.error('Error fetching HF models:', e);
    }

    return [...orModels, ...hfModels];
  }

  static async searchHFHub(query: string, hfApiKey?: string): Promise<Model[]> {
    if (!query.trim() || query.length < 3) return [];
    
    const response = await fetch(`/api/hf/models?search=${encodeURIComponent(query)}`, {
      headers: hfApiKey ? { 'x-hf-key': hfApiKey } : {}
    });
    if (response.ok) {
      return await response.json();
    }
    return [];
  }

  static async sendMessage(
    payload: any,
    endpoint: string,
    onStream?: (chunk: string, usage?: any) => void
  ): Promise<any> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API request failed');
    }

    // Handle Streaming
    if (payload.stream && response.body && onStream) {
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
            onStream(content, parsed.usage);
          } catch (e) {}
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
