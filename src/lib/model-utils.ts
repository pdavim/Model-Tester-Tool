import { useModelStore } from '@/store/useModelStore';

export interface ServiceInfo {
  isHF: boolean;
  endpoint: string;
}

/**
 * Robustly detects the appropriate service provider (OpenRouter or Hugging Face)
 * for a given model ID by checking against the current model store state.
 */
export const detectModelService = (modelId: string): ServiceInfo => {
  const { models, customModels, hfHubModels } = useModelStore.getState();
  
  const findInList = (list: any[]) => list.find(m => m.id === modelId);
  const orModel = findInList(models);
  const customModel = findInList(customModels);
  const hfHubModel = findInList(hfHubModels);
  
  // Priority 1: Explicit provider field from metadata
  if (customModel?.provider === 'huggingface' || hfHubModel?.provider === 'huggingface' || orModel?.provider === 'huggingface') {
    return { isHF: true, endpoint: '/api/hf/chat' };
  }
  
  if (orModel?.provider === 'openrouter') {
    return { isHF: false, endpoint: '/api/chat' };
  }

  // Priority 2: Custom and Hub models default to HF
  if (customModel || hfHubModel) {
    return { isHF: true, endpoint: '/api/hf/chat' };
  }

  // Priority 3: Fallback heuristics for identifiers not yet in the store
  // OpenRouter IDs almost always contain ':' (e.g., 'openai/gpt-4o' vs 'openai/gpt-4o:free')
  // OR they are known top-level OpenRouter models.
  // Hugging Face IDs almost ALWAYS contain a '/' and NEVER contain a ':'
  const hasSlash = modelId.includes('/');
  const hasColon = modelId.includes(':');

  if (orModel) {
    return { isHF: false, endpoint: '/api/chat' };
  }

  if (hasSlash && !hasColon) {
    // Standard HF format: 'owner/model-name'
    return { isHF: true, endpoint: '/api/hf/chat' };
  }

  // Default to OpenRouter for everything else (or unknown formats)
  return { isHF: false, endpoint: '/api/chat' };
};
