import { OpenRouterAdapter } from './OpenRouterAdapter';
import { HuggingFaceAdapter } from './HuggingFaceAdapter';
import { IProvider } from './IProvider';
import { PROVIDERS } from '../../shared/constants';

export class ProviderFactory {
  static getProvider(providerName: string): IProvider {
    switch (providerName.toLowerCase()) {
      case PROVIDERS.OPENROUTER:
        return new OpenRouterAdapter();
      case PROVIDERS.HUGGINGFACE:
        return new HuggingFaceAdapter();
      default:
        throw new Error(`Unsupported provider: ${providerName}`);
    }
  }

  /**
   * Detective method to find the right provider based on model ID string
   */
  static getProviderByModel(modelId: string): IProvider {
    // Logic from legacy model-utils shifted here
    if (modelId.includes('/') && !modelId.includes(':')) {
      // Likely Hugging Face (e.g., "meta-llama/Llama-2-7b-chat-hf")
      // Unless it's an OpenRouter ID which sometimes uses slashes but has a specific list
      // For now, let's assume if it includes a slash it's HF unless it's a known OR model
      // This will be refined as ChatService uses it
      return this.getProvider(PROVIDERS.HUGGINGFACE);
    }
    
    // Default to OpenRouter for most cases
    return this.getProvider(PROVIDERS.OPENROUTER);
  }
}
