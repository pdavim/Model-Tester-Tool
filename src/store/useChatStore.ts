import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message, Attachment, ChatSession, ChatParameters } from '@/types';
import { ApiService } from '@/services/api.service';
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
  
  // Parameters (local to current interaction but syncable)
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
  createNewSession: () => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, name: string) => void;
  clearChat: () => void;
  
  handleSend: (config: { openRouterKey: string; hfApiKey: string; selectedModel: string }) => Promise<void>;
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
      
      setSystemPrompt: (systemPrompt) => set({ systemPrompt }),
      setTemperature: (temperature) => set({ temperature }),
      setTopP: (topP) => set({ topP }),
      setMaxTokens: (maxTokens) => set({ maxTokens }),
      setFrequencyPenalty: (frequencyPenalty) => set({ frequencyPenalty }),
      setPresencePenalty: (presencePenalty) => set({ presencePenalty }),

      setCurrentSessionId: (currentSessionId) => set({ currentSessionId }),
      
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

      handleSend: async ({ openRouterKey, hfApiKey, selectedModel }) => {
        const { input, isLoading, currentSessionId, selectedFiles, sessions } = get();
        if (!input.trim() || isLoading || !currentSessionId) return;

        const currentSession = sessions.find(s => s.id === currentSessionId);
        if (!currentSession) return;

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
          : [selectedModel];

        for (const modelId of modelsToTest) {
          const startTime = Date.now();
          const assistantMessage: Message = { 
            role: 'assistant', 
            content: '', 
            modelId, 
            isLoading: true 
          };

          // Add placeholder for assistant
          set((state) => ({
            sessions: state.sessions.map(s => s.id === currentSessionId ? { 
              ...s, 
              messages: [...s.messages, assistantMessage] 
            } : s)
          }));

          try {
            const isHF = modelId.includes('/') || !modelId.includes(':'); // Simplified check
            const endpoint = isHF ? '/api/hf/chat' : '/api/chat';

            const payload = {
              model: modelId,
              messages: [
                { role: 'system', content: get().systemPrompt },
                ...updatedMessages.map(m => ({ 
                  role: m.role, 
                  content: m.role === 'user' && m.content === input ? processedContent : m.content 
                }))
              ],
              temperature: get().temperature,
              top_p: get().topP,
              max_tokens: get().maxTokens,
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

            // Mark completed
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
        currentSessionId: state.currentSessionId 
      }),
    }
  )
);
