/**
 * Utility for handling fetch requests with exponential backoff retries.
 * Designed to handle 429 (Rate Limit) and 5xx (Server Error) responses.
 */
import { Logger } from '../infra/Logging';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  retryOnStatusCodes?: number[];
  statusSpecificMaxRetries?: Record<number, number>;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 15000,
  backoffFactor: 2,
  retryOnStatusCodes: [429, 500, 502, 503, 504],
  statusSpecificMaxRetries: {
    429: 5, // Increase budget for rate limits
    503: 4, // Often transient (model loading)
  },
};

export class RetryUtility {
  /**
   * Enhanced fetch with adaptive retry logic
   */
  static async fetchWithRetry(
    url: string,
    init?: RequestInit,
    options: RetryOptions = {}
  ): Promise<Response> {
    const opts = { 
      ...DEFAULT_OPTIONS, 
      ...options,
      statusSpecificMaxRetries: { 
        ...DEFAULT_OPTIONS.statusSpecificMaxRetries, 
        ...options.statusSpecificMaxRetries 
      }
    };
    
    let lastError: Error | null = null;
    let attempt = 0;

    while (true) {
      try {
        const response = await fetch(url, init);

        if (response.ok) {
          return response;
        }

        const isRetryable = opts.retryOnStatusCodes.includes(response.status);
        const maxRetries = opts.statusSpecificMaxRetries[response.status] ?? opts.maxRetries;

        if (isRetryable && attempt < maxRetries) {
          attempt++;
          
          // Handle Retry-After header
          const retryAfter = response.headers.get('Retry-After');
          let delay = opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1);
          
          if (retryAfter) {
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds)) {
              delay = seconds * 1000;
            } else {
              const retryDate = new Date(retryAfter);
              if (!isNaN(retryDate.getTime())) {
                delay = Math.max(0, retryDate.getTime() - Date.now());
              }
            }
          }

          // More aggressive backoff for repeated 429s if no Retry-After
          if (response.status === 429 && !retryAfter) {
            delay = delay * 1.5; 
          }

          delay = Math.min(opts.maxDelayMs, delay) + (Math.random() * 300);

          Logger.info(`Retrying request to ${url} (Attempt ${attempt}/${maxRetries}) in ${Math.round(delay)}ms (Status: ${response.status})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        if (attempt >= maxRetries) {
          Logger.warn(`Max retries reached for ${url} (Status: ${response.status})`);
        }
        
        return response;
      } catch (error: any) {
        lastError = error;
        
        if (error.name === 'AbortError') {
          throw error;
        }

        attempt++;
        if (attempt > opts.maxRetries) {
          throw error;
        }

        const delay = Math.min(opts.maxDelayMs, opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1)) + (Math.random() * 300);
        Logger.warn(`Network error on ${url} (Attempt ${attempt}/${opts.maxRetries}): ${error.message}. Retrying in ${Math.round(delay)}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

