import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiService } from '../api.service';

describe('ApiService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  it('should call fetch with correct parameters in sendMessage', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ choices: [{ message: { content: 'hello' } }] }),
      headers: { get: vi.fn().mockReturnValue('application/json') }
    };
    
    (fetch as any).mockResolvedValue(mockResponse);

    const payload = { model: 'test', messages: [] };
    const result = await ApiService.sendMessage(payload, '/api/chat');

    expect(fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload)
    }));
    expect(result.choices[0].message.content).toBe('hello');
  });

  it('should handle streaming correctly', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"hi"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    });

    const mockResponse = {
      ok: true,
      body: stream,
      headers: { get: vi.fn().mockReturnValue('application/json') }
    };

    (fetch as any).mockResolvedValue(mockResponse);

    const onStream = vi.fn();
    await ApiService.sendMessage({ stream: true }, '/api/chat', onStream);

    expect(onStream).toHaveBeenCalledWith('hi', undefined);
  });

  it('should throw error on non-ok response', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: { message: 'Auth failed' } })
    });

    await expect(ApiService.sendMessage({}, '/api/chat'))
      .rejects.toThrow('Auth failed');
  });
});
