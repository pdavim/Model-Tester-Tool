import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useConfigStore } from './useConfigStore';
import { useModelStore } from './useModelStore';
import { ApiService } from '@/services/api.service';
import { detectModelService } from '@/lib/model-utils';
import { toast } from 'sonner';

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  input: string;
  selectedFiles: Attachment[];
  isLoading: boolean;
  isProcessingFiles: boolean;
  comparisonMode: boolean;
  comparisonModels: string[];
  
  // Default Parameters (used for new sessions)
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
  
  // Parameter actions (update current session)
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
  
  handleSend: (config: { openRouterKey: string; hfApiKey: string }) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      input: '',
      selectedFiles: [],
      isLoading: false,
      isProcessingFiles: false,
      comparisonMode: false,
      comparisonModels: [],

      // Global defaults
      systemPrompt: 'You are a helpful AI assistant.',
      temperature: 0.7,
      topP: 1,
      maxTokens: 2048,
      frequencyPenalty: 0,
      presencePenalty: 0,

      setInput: (input) => set({ input }),
      setSelectedFiles: (selectedFiles) => set({ selectedFiles }),
      removeAttachment: (id) => set((state) => ({ 
        selectedFiles: state.selectedFiles.filter(f => f.id !== id) 
      })),
      setIsProcessingFiles: (isProcessingFiles) => set({ isProcessingFiles }),
      setComparisonMode: (comparisonMode) => set({ comparisonMode }),
      setComparisonModels: (comparisonModels) => set({ comparisonModels }),
      
      // Update either current session or global defaults
      setSystemPrompt: (systemPrompt) => set((state) => {
        if (state.currentSessionId) {
          return {
            sessions: state.sessions.map(s => s.id === state.currentSessionId ? {
              ...s, parameters: { ...s.parameters, systemPrompt }
            } : s)
          };
        }
        return { systemPrompt };
      }),
      setTemperature: (val) => set((state) => {
        const temperature = typeof val === 'number' && !isNaN(val) ? val : 0.7;
        if (state.currentSessionId) {
          return {
            sessions: state.sessions.map(s => s.id === state.currentSessionId ? {
              ...s, parameters: { ...s.parameters, temperature }
            } : s)
          };
        }
        return { temperature };
      }),
      setTopP: (val) => set((state) => {
        const topP = typeof val === 'number' && !isNaN(val) ? val : 1;
        if (state.currentSessionId) {
          return {
            sessions: state.sessions.map(s => s.id === state.currentSessionId ? {
              ...s, parameters: { ...s.parameters, topP }
            } : s)
          };
        }
        return { topP };
      }),
      setMaxTokens: (val) => set((state) => {
        const maxTokens = typeof val === 'number' && !isNaN(val) ? val : 2048;
        if (state.currentSessionId) {
          return {
            sessions: state.sessions.map(s => s.id === state.currentSessionId ? {
              ...s, parameters: { ...s.parameters, maxTokens }
            } : s)
          };
        }
        return { maxTokens };
      }),
      setFrequencyPenalty: (val) => set((state) => {
        const frequencyPenalty = typeof val === 'number' && !isNaN(val) ? val : 0;
        if (state.currentSessionId) {
          return {
            sessions: state.sessions.map(s => s.id === state.currentSessionId ? {
              ...s, parameters: { ...s.parameters, frequencyPenalty }
            } : s)
          };
        }
        return { frequencyPenalty };
      }),
      setPresencePenalty: (val) => set((state) => {
        const presencePenalty = typeof val === 'number' && !isNaN(val) ? val : 0;
        if (state.currentSessionId) {
          return {
            sessions: state.sessions.map(s => s.id === state.currentSessionId ? {
              ...s, parameters: { ...s.parameters, presencePenalty }
            } : s)
          };
        }
        return { presencePenalty };
      }),

      setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),
      
      setSelectedModelForSession: (sessionId, modelId, service) => set((state) => ({
        sessions: state.sessions.map(s => s.id === sessionId ? {
          ...s, parameters: { ...s.parameters, selectedModel: modelId, selectedService: service }
        } : s)
      })),

      createNewSession: () => {
        const newSession: ChatSession = {
          id: Math.random().toString(36).substring(7),
          name: 'New Conversation',
          messages: [],
          parameters: {
            temperature: get().temperature,
            topP: get().topP,
            maxTokens: get().maxTokens,
            frequencyPenalty: get().frequencyPenalty,
            presencePenalty: get().presencePenalty,
            systemPrompt: get().systemPrompt,
            selectedModel: '',
            selectedService: 'all'
          },
          createdAt: Date.now()
        };
        set((state) => ({ 
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id 
        }));
      },

      deleteSession: (id) => set((state) => {
        const nextSessions = state.sessions.filter(s => s.id !== id);
        return { 
          sessions: nextSessions,
          currentSessionId: state.currentSessionId === id ? (nextSessions[0]?.id || null) : state.currentSessionId
        };
      }),

      renameSession: (id, name) => set((state) => ({
        sessions: state.sessions.map(s => s.id === id ? { ...s, name } : s)
      })),

      clearChat: () => set((state) => ({
        sessions: state.sessions.map(s => s.id === state.currentSessionId ? { ...s, messages: [] } : s)
      })),

      handleSend: async ({ openRouterKey, hfApiKey }) => {
        const { input, isLoading, currentSessionId, selectedFiles, sessions } = get();
        if (!input.trim() || isLoading || !currentSessionId) return;

        const currentSession = sessions.find(s => s.id === currentSessionId);
        if (!currentSession) return;

        // Ensure we have a model selected
        const activeModelId = currentSession.parameters.selectedModel;
        if (!activeModelId && !get().comparisonMode) {
          toast.error('Please select a model for this session');
          return;
        }

        // Process attachments
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
          role: 'user', 
          content: input,
          attachments: [...selectedFiles] 
        };

        const updatedMessages = [...currentSession.messages, userMessage];
        
        set((state) => ({
          input: '',
          selectedFiles: [],
          isLoading: true,
          sessions: state.sessions.map(s => s.id === currentSessionId ? { ...s, messages: updatedMessages } : s)
        }));

        const modelsToTest = get().comparisonMode && get().comparisonModels.length > 0 
          ? get().comparisonModels 
          : [activeModelId];

        for (const modelId of modelsToTest) {
          if (!modelId) continue;
          
          const startTime = Date.now();
          const assistantMessage: Message = { 
            role: 'assistant', 
            content: '', 
            modelId, 
            isLoading: true 
          };

          set((state) => ({
            sessions: state.sessions.map(s => s.id === currentSessionId ? { 
              ...s, 
              messages: [...s.messages, assistantMessage] 
            } : s)
          }));

          try {
            const { isHF, endpoint } = detectModelService(modelId);

            const payload = {
              model: modelId,
              messages: [
                { role: 'system', content: currentSession.parameters.systemPrompt },
                ...updatedMessages.map(m => ({ 
                  role: m.role, 
                  content: m.role === 'user' && m.content === input ? processedContent : m.content 
                }))
              ],
              temperature: currentSession.parameters.temperature,
              top_p: currentSession.parameters.topP,
              max_tokens: currentSession.parameters.maxTokens,
              stream: true,
              openRouterKey,
              hfApiKey
            };

            await ApiService.sendMessage(payload, endpoint, (chunk, usage) => {
              set((state) => ({
                sessions: state.sessions.map(s => s.id === currentSessionId ? {
                  ...s,
                  messages: s.messages.map(m => (m.modelId === modelId && m.isLoading) ? {
                    ...m,
                    content: m.content + chunk,
                    usage: usage || m.usage
                  } : m)
                } : s)
              }));
            });

            set((state) => ({
              sessions: state.sessions.map(s => s.id === currentSessionId ? {
                ...s,
                messages: s.messages.map(m => (m.modelId === modelId && m.isLoading) ? {
                  ...m,
                  isLoading: false,
                  responseTime: Date.now() - startTime
                } : m)
              } : s)
            }));

          } catch (error: any) {
            set((state) => ({
              sessions: state.sessions.map(s => s.id === currentSessionId ? {
                ...s,
                messages: s.messages.map(m => (m.modelId === modelId && m.isLoading) ? {
                  ...m,
                  isLoading: false,
                  content: `Error: ${error.message}`,
                  error: 'true'
                } : m)
              } : s)
            }));
          }

          if (modelsToTest.length > 1) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        set({ isLoading: false });
      }
    }),
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
