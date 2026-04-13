export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  responseTime?: number;
  error?: string;
  isLoading?: boolean;
  mediaUrl?: string;
  mediaType?: 'audio' | 'video' | 'image' | 'pdf' | 'md';
  attachments?: Attachment[];
  rawResponse?: any;
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'pdf' | 'md';
  url: string;
  content?: string;
  base64?: string;
}

export interface ChatSession {
  id: string;
  name: string;
  messages: Message[];
  parameters: ChatParameters;
  createdAt: number;
}

export interface ChatParameters {
  temperature: number;
  topP: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
  selectedModel: string;
  selectedService: 'openrouter' | 'huggingface' | 'all';
}

export interface ParameterPreset {
  id: string;
  name: string;
  parameters: Omit<ChatParameters, 'systemPrompt' | 'selectedModel'>;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  created?: number;
  pipeline_tag?: string;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
  pricing?: {
    prompt: string;
    completion: string;
    request?: string;
    image?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  isCustom?: boolean;
  provider?: 'openrouter' | 'huggingface';
}
