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
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
  retryOnStatusCodes: [429, 500, 502, 503, 504],
};

export class RetryUtility {
  /**
   * Enhanced fetch with retry logic
   */
  static async fetchWithRetry(
    url: string,
    init?: RequestInit,
    options: RetryOptions = {}
  ): Promise<Response> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= opts.maxRetries) {
      try {
        const response = await fetch(url, init);

        if (response.ok) {
          return response;
        }

        // Check if status code is retryable
        if (opts.retryOnStatusCodes.includes(response.status)) {
          attempt++;
          if (attempt > opts.maxRetries) {
            Logger.warn(`Max retries reached for ${url} (Status: ${response.status})`);
            return response; // Return the last error response if retries exhausted
          }

          // Handle Retry-After header
          const retryAfter = response.headers.get('Retry-After');
          let delay = opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1);
          
          if (retryAfter) {
            const seconds = parseInt(retryAfter, 10);
            if (!isNaN(seconds)) {
              delay = seconds * 1000;
            } else {
              // It might be a date string
              const retryDate = new Date(retryAfter);
              if (!isNaN(retryDate.getTime())) {
                delay = Math.max(0, retryDate.getTime() - Date.now());
              }
            }
          }

          // Add jitter to avoid thundering herd
          delay = Math.min(opts.maxDelayMs, delay) + (Math.random() * 200);

          Logger.info(`Retrying request to ${url} (Attempt ${attempt}/${opts.maxRetries}) in ${Math.round(delay)}ms (Status: ${response.status})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        return response; // Non-retryable status code
      } catch (error: any) {
        lastError = error;
        
        // Network errors are generally retryable
        if (error.name === 'AbortError') {
          throw error; // Don't retry on manual abort
        }

        attempt++;
        if (attempt > opts.maxRetries) {
          throw error;
        }

        const delay = Math.min(opts.maxDelayMs, opts.initialDelayMs * Math.pow(opts.backoffFactor, attempt - 1)) + (Math.random() * 200);
        Logger.warn(`Network error on ${url} (Attempt ${attempt}/${opts.maxRetries}): ${error.message}. Retrying in ${Math.round(delay)}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error(`Failed to fetch ${url} after ${opts.maxRetries} retries`);
  }
}
