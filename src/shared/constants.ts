export const API_BASE = '/api';

export const ENDPOINTS = {
  CHAT: `${API_BASE}/chat`,
  HF_CHAT: `${API_BASE}/hf/chat`,
  HF_INFERENCE: `${API_BASE}/hf/inference`,
  MODELS: `${API_BASE}/models`,
  HF_MODELS: `${API_BASE}/hf/models`,
  HEALTH: `${API_BASE}/health`,
  METRICS: `${API_BASE}/metrics`,
};

export const PROVIDERS = {
  OPENROUTER: 'openrouter',
  HUGGINGFACE: 'huggingface',
} as const;

export const DEFAULT_PARAMS = {
  TEMPERATURE: 0.7,
  TOP_P: 1,
  MAX_TOKENS: 2048,
  SYSTEM_PROMPT: 'You are a helpful AI assistant.',
};

export const STORAGE_KEYS = {
  CHATS: 'model-tester-chats',
  CONFIG: 'model-tester-config',
  MODELS: 'model-tester-models',
  BATTLE: 'model-tester-battle-v2',
};
