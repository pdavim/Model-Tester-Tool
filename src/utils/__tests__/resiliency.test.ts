import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryUtility } from '../RetryUtility';
import { PromptNormalizer } from '../PromptNormalizer';

describe('RetryUtility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should return response if first fetch is successful', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'success' }),
    });

    const response = await RetryUtility.fetchWithRetry('https://example.com');
    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 status code', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: false, status: 429, headers: new Map() })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    const response = await RetryUtility.fetchWithRetry('https://example.com', {}, { 
      maxRetries: 2, 
      initialDelayMs: 10 
    });

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should respect Retry-After header', async () => {
    const start = Date.now();
    (global.fetch as any)
      .mockResolvedValueOnce({ 
        ok: false, 
        status: 429, 
        headers: new Map([['Retry-After', '1']]) // 1 second
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

    await RetryUtility.fetchWithRetry('https://example.com', {}, { 
      maxRetries: 1, 
      initialDelayMs: 10 
    });

    const duration = Date.now() - start;
    expect(duration).toBeGreaterThanOrEqual(1000);
    expect(global.fetch).toHaveBeenCalledTimes(2);

  });
});

describe('PromptNormalizer', () => {
  it('should identify picky models', () => {
    expect(PromptNormalizer.isPickyModel('google/gemma-7b')).toBe(true);
    expect(PromptNormalizer.isPickyModel('qwen/qwen-72b')).toBe(true);
    expect(PromptNormalizer.isPickyModel('gpt-4')).toBe(false);
  });

  it('should merge system message into first user message', () => {
    const messages = [
      { role: 'system', content: 'Be a pirate.' },
      { role: 'user', content: 'Hello.' },
      { role: 'assistant', content: 'Ahoy!' }
    ];

    const normalized = PromptNormalizer.normalize('google/gemma-7b', messages as any);
    
    expect(normalized).toHaveLength(2);
    expect(normalized[0].role).toBe('user');
    expect(normalized[0].content).toContain('Instructions: Be a pirate.');
    expect(normalized[0].content).toContain('User Question: Hello.');
    expect(normalized[1].role).toBe('assistant');
  });

  it('should ensure alternating roles', () => {
    const messages = [
      { role: 'user', content: 'Hi' },
      { role: 'user', content: 'Actually, hi there' },
      { role: 'assistant', content: 'Hello' }
    ];

    const normalized = PromptNormalizer.normalize('google/gemma-7b', messages as any);
    
    expect(normalized).toHaveLength(2);
    expect(normalized[0].role).toBe('user');
    expect(normalized[0].content).toContain('Hi\n\nActually, hi there');
  });
});
