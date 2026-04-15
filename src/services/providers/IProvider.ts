import { ChatPayload } from '../api/validation/chat.schema';

export interface IProvider {
  name: string;
  chat(payload: ChatPayload, options?: { signal?: AbortSignal }): Promise<ReadableStream | Response>;
  getModels(): Promise<any[]>;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
}
