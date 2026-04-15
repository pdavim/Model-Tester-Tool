import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { ApiService } from '@/services/api.service';
import { detectModelService } from '@/lib/model-utils';
import { toast } from 'sonner';
import { ChatSession, Message, Attachment } from '@/types';
import { ENDPOINTS, DEFAULT_PARAMS } from '@/shared/constants';

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  input: string;
  selectedFiles: Attachment[];
  isLoading: boolean;
  isProcessingFiles: boolean;
  comparisonMode: boolean;
  comparisonModels: string[];
  
  // Default Parameters
  systemPrompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  frequencyPenalty: number;
  presencePenalty: number;

  // Actions
  setInput: (input: string) => void;
  setSelectedFiles: (files: Attachment[]) => void;
  removeAttachment: (id: string) => void;
  setIsProcessingFiles: (val: boolean) => void;
  setComparisonMode: (val: boolean) => void;
  setComparisonModels: (models: string[]) => void;
  
  setSystemPrompt: (val: string) => void;
  setTemperature: (val: number) => void;
  setTopP: (val: number) => void;
  setMaxTokens: (val: number) => void;
  setFrequencyPenalty: (val: number) => void;
  setPresencePenalty: (val: number) => void;

  setCurrentSessionId: (id: string) => void;
  setSelectedModelForSession: (sessionId: string, modelId: string, service: 'openrouter' | 'huggingface' | 'all') => void;
  createNewSession: () => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  clearChat: () => void;
  
  handleSend: (config: { openRouterKey: string; hfApiKey: string }, abortSignal?: AbortSignal) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    immer((set, get) => ({
      sessions: [],
      currentSessionId: null,
      input: '',
      selectedFiles: [],
      isLoading: false,
      isProcessingFiles: false,
      comparisonMode: false,
      comparisonModels: [],

      // Global defaults
      systemPrompt: DEFAULT_PARAMS.SYSTEM_PROMPT,
      temperature: DEFAULT_PARAMS.TEMPERATURE,
      topP: DEFAULT_PARAMS.TOP_P,
      maxTokens: DEFAULT_PARAMS.MAX_TOKENS,
      frequencyPenalty: 0,
      presencePenalty: 0,

      setInput: (input) => set({ input }),
      setSelectedFiles: (selectedFiles) => set({ selectedFiles }),
      removeAttachment: (id) => set((state) => {
        state.selectedFiles = state.selectedFiles.filter(f => f.id !== id);
      }),
      setIsProcessingFiles: (isProcessingFiles) => set({ isProcessingFiles }),
      setComparisonMode: (comparisonMode) => set({ comparisonMode }),
      setComparisonModels: (comparisonModels) => set({ comparisonModels }),
      
      setSystemPrompt: (systemPrompt) => set((state) => {
        if (state.currentSessionId) {
          const session = state.sessions.find(s => s.id === state.currentSessionId);
          if (session) session.parameters.systemPrompt = systemPrompt;
        } else {
          state.systemPrompt = systemPrompt;
        }
      }),
      setTemperature: (val) => set((state) => {
        const temp = typeof val === 'number' && !isNaN(val) ? val : DEFAULT_PARAMS.TEMPERATURE;
        if (state.currentSessionId) {
          const session = state.sessions.find(s => s.id === state.currentSessionId);
          if (session) session.parameters.temperature = temp;
        } else {
          state.temperature = temp;
        }
      }),
      setTopP: (val) => set((state) => {
        const topP = typeof val === 'number' && !isNaN(val) ? val : DEFAULT_PARAMS.TOP_P;
        if (state.currentSessionId) {
          const session = state.sessions.find(s => s.id === state.currentSessionId);
          if (session) session.parameters.topP = topP;
        } else {
          state.topP = topP;
        }
      }),
      setMaxTokens: (val) => set((state) => {
        const max = typeof val === 'number' && !isNaN(val) ? val : DEFAULT_PARAMS.MAX_TOKENS;
        if (state.currentSessionId) {
          const session = state.sessions.find(s => s.id === state.currentSessionId);
          if (session) session.parameters.maxTokens = max;
        } else {
          state.maxTokens = max;
        }
      }),
      setFrequencyPenalty: (val) => set((state) => {
        const fp = typeof val === 'number' && !isNaN(val) ? val : 0;
        if (state.currentSessionId) {
          const session = state.sessions.find(s => s.id === state.currentSessionId);
          if (session) session.parameters.frequencyPenalty = fp;
        } else {
          state.frequencyPenalty = fp;
        }
      }),
      setPresencePenalty: (val) => set((state) => {
        const pp = typeof val === 'number' && !isNaN(val) ? val : 0;
        if (state.currentSessionId) {
          const session = state.sessions.find(s => s.id === state.currentSessionId);
          if (session) session.parameters.presencePenalty = pp;
        } else {
          state.presencePenalty = pp;
        }
      }),

      setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),
      
      setSelectedModelForSession: (sessionId, modelId, service) => set((state) => {
        const session = state.sessions.find(s => s.id === sessionId);
        if (session) {
          session.parameters.selectedModel = modelId;
          session.parameters.selectedService = service;
        }
      }),

      createNewSession: () => {
        const state = get();
        const newSession: ChatSession = {
          id: Math.random().toString(36).substring(7),
          name: 'New Conversation',
          messages: [],
          parameters: {
            temperature: state.temperature,
            topP: state.topP,
            maxTokens: state.maxTokens,
            frequencyPenalty: state.frequencyPenalty,
            presencePenalty: state.presencePenalty,
            systemPrompt: state.systemPrompt,
            selectedModel: '',
            selectedService: 'all'
          },
          createdAt: Date.now()
        };
        set((state) => {
          state.sessions.unshift(newSession);
          state.currentSessionId = newSession.id;
        });
      },

      deleteSession: (id) => set((state) => {
        const nextSessions = state.sessions.filter(s => s.id !== id);
        state.sessions = nextSessions;
        if (state.currentSessionId === id) {
          state.currentSessionId = nextSessions[0]?.id || null;
        }
      }),

      renameSession: (id, name) => set((state) => {
        const session = state.sessions.find(s => s.id === id);
        if (session) session.name = name;
      }),

      clearChat: () => set((state) => {
        const session = state.sessions.find(s => s.id === state.currentSessionId);
        if (session) session.messages = [];
      }),

      handleSend: async ({ openRouterKey, hfApiKey }, abortSignal) => {
        const { input, isLoading, currentSessionId, selectedFiles, sessions, comparisonMode, comparisonModels } = get();
        if (!input.trim() || isLoading || !currentSessionId) return;

        const sessionIndex = sessions.findIndex(s => s.id === currentSessionId);
        if (sessionIndex === -1) return;
        const currentSession = sessions[sessionIndex];

        const activeModelId = currentSession.parameters.selectedModel;
        if (!activeModelId && !comparisonMode) {
          toast.error('Please select a model for this session');
          return;
        }

        // Process attachments into prompt
        let processedContent: any = input;
        let docText = "";
        selectedFiles.forEach(file => {
          if ((file.type === 'pdf' || file.type === 'md') && file.content) {
            docText += `\n\n[Content from ${file.name}]:\n${file.content}\n`;
          }
        });
        
        if (docText) processedContent = `${input}\n${docText}`;

        const hasVisuals = selectedFiles.some(f => f.type === 'image' || f.type === 'video');
        if (hasVisuals) {
          const contentArray: any[] = [{ type: 'text', text: processedContent }];
          selectedFiles.forEach(file => {
            if ((file.type === 'image' || file.type === 'video') && file.base64) {
              contentArray.push({ type: 'image_url', image_url: { url: file.base64 } });
            }
          });
          processedContent = contentArray;
        }

        const userMessage: Message = { 
          id: crypto.randomUUID(),
          role: 'user', 
          content: input,
          processedContent: processedContent,
          attachments: [...selectedFiles] 
        };

        const historyForApi = [...currentSession.messages, userMessage];
        
        // Optimistic UI update
        set((state) => {
          state.input = '';
          state.selectedFiles = [];
          state.isLoading = true;
          const session = state.sessions.find(s => s.id === currentSessionId);
          if (session) session.messages.push(userMessage);
        });

        const modelsToTest = comparisonMode && comparisonModels.length > 0 
          ? comparisonModels 
          : [activeModelId];

        for (const modelId of modelsToTest) {
          if (!modelId || abortSignal?.aborted) continue;
          
          const startTime = Date.now();
          const assistantMessageId = crypto.randomUUID();
          const assistantMessage: Message = { 
            role: 'assistant', 
            content: '', 
            modelId, 
            isLoading: true,
            id: assistantMessageId // Ensure unique ID for updates
          };

          set((state) => {
            const session = state.sessions.find(s => s.id === currentSessionId);
            if (session) session.messages.push(assistantMessage);
          });

          try {
            const { endpoint } = detectModelService(modelId);

            const payload = {
              model: modelId,
              messages: [
                { role: 'system', content: currentSession.parameters.systemPrompt },
                ...historyForApi.map(m => ({ 
                  role: m.role, 
                  content: m.processedContent || m.content
                }))
              ],
              temperature: currentSession.parameters.temperature,
              top_p: currentSession.parameters.topP,
              max_tokens: currentSession.parameters.maxTokens,
              stream: true,
              openRouterKey,
              hfApiKey
            };

            await ApiService.sendMessage(payload, endpoint, {
              signal: abortSignal,
              onStream: (chunk, usage) => {
                set((state) => {
                  const session = state.sessions.find(s => s.id === currentSessionId);
                  if (session) {
                    const msg = session.messages.find(m => m.id === assistantMessageId);
                    if (msg) {
                      msg.content += chunk;
                      if (usage) msg.usage = usage;
                    }
                  }
                });
              }
            });

            set((state) => {
              const session = state.sessions.find(s => s.id === currentSessionId);
              if (session) {
                const msg = session.messages.find(m => m.id === assistantMessageId);
                if (msg) {
                  msg.isLoading = false;
                  msg.responseTime = Date.now() - startTime;
                }
              }
            });

          } catch (error: any) {
            if (error.name === 'AbortError') {
              Logger.info('Stream aborted by user');
              return;
            }
            set((state) => {
              const session = state.sessions.find(s => s.id === currentSessionId);
              if (session) {
                const msg = session.messages.find(m => m.id === assistantMessageId);
                if (msg) {
                  msg.isLoading = false;
                  msg.content = `Error: ${error.message}`;
                  msg.error = 'true';
                }
              }
            });
          }

          if (modelsToTest.length > 1 && !abortSignal?.aborted) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        set({ isLoading: false });
      }
    })),
    {
      name: 'model-tester-chats',
      partialize: (state) => ({ 
        sessions: state.sessions, 
        currentSessionId: state.currentSessionId,
        systemPrompt: state.systemPrompt,
        temperature: state.temperature,
        topP: state.topP,
        maxTokens: state.maxTokens,
        frequencyPenalty: state.frequencyPenalty,
        presencePenalty: state.presencePenalty
      }),
    }
  )
);
