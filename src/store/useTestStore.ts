import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { ApiService } from '@/services/api.service';
import { useConfigStore } from './useConfigStore';
import { detectModelService } from '@/lib/model-utils';
import { toast } from 'sonner';
import { BENCHMARK_PROMPTS, BenchmarkPrompt } from '@/utils/benchmark-prompts';

export interface CapabilityResult {
  categoryId: string;
  categoryName: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  response?: string;
  latency: number;
  tokens: number;
  error?: string;
  id?: string;
}

export interface TestResult {
  model: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  overallLatency: number;
  overallTokens: number;
  capabilities: CapabilityResult[];
  report?: string;
}

interface TestState {
  testModels: string[];
  testResults: TestResult[];
  isTesting: boolean;
  isAnalyzing: boolean;
  currentTestIndex: number; 
  currentStepIndex: number; 
  battleAnalysis: string | null;
  abortController: AbortController | null;
  
  // Actions
  addModelToTest: (id: string) => void;
  removeModelFromTest: (id: string) => void;
  setTestModels: (ids: string[]) => void;
  clearResults: () => void;
  stopBattle: () => void;
  runTestBatch: (prompts: BenchmarkPrompt[], config: { openRouterKey: string; hfApiKey: string }) => Promise<void>;
  generateAIReport: (config: { hfApiKey: string }) => Promise<void>;
}

export const useTestStore = create<TestState>()(
  persist(
    immer((set, get) => ({
      testModels: [],
      testResults: [],
      isTesting: false,
      isAnalyzing: false,
      currentTestIndex: -1,
      currentStepIndex: -1,
      battleAnalysis: null,
      abortController: null,

      addModelToTest: (id) => set((state) => {
        if (state.testModels.includes(id)) return;
        if (state.testModels.length >= 10) {
          toast.error('Maximum 10 models for Battle Mode');
          return;
        }
        state.testModels.push(id);
      }),

      removeModelFromTest: (id) => set((state) => {
        state.testModels = state.testModels.filter(m => m !== id);
      }),

      setTestModels: (testModels) => set({ testModels }),

      clearResults: () => set((state) => {
        state.testResults = [];
        state.battleAnalysis = null;
        state.currentTestIndex = -1;
        state.currentStepIndex = -1;
      }),

      stopBattle: () => {
        const { abortController } = get();
        if (abortController) {
          abortController.abort();
          set((state) => {
            state.isTesting = false;
            state.abortController = null;
          });
          toast.info('Battle stopped by user');
        }
      },

      runTestBatch: async (prompts, { openRouterKey, hfApiKey }) => {
        const { testModels } = get();
        if (testModels.length === 0) return;

        const controller = new AbortController();
        
        set((state) => {
          state.isTesting = true;
          state.abortController = controller;
          state.battleAnalysis = null;
          state.currentTestIndex = 0;
          state.currentStepIndex = 0;
          state.testResults = testModels.map(id => ({ 
            model: id, 
            status: 'pending',
            overallLatency: 0,
            overallTokens: 0,
            capabilities: prompts.map(p => ({
              categoryId: p.id,
              categoryName: p.category,
              status: 'pending',
              latency: 0,
              tokens: 0,
              id: crypto.randomUUID()
            }))
          }));
        });

        try {
          for (let i = 0; i < testModels.length; i++) {
            const modelId = testModels[i];
            set({ currentTestIndex: i });

            for (let j = 0; j < prompts.length; j++) {
              if (controller.signal.aborted) throw new Error('Aborted');
              
              const prompt = prompts[j];
              set({ currentStepIndex: j });

              set((state) => {
                const result = state.testResults.find(r => r.model === modelId);
                if (result) {
                  result.status = 'running';
                  const cap = result.capabilities.find(c => c.categoryId === prompt.id);
                  if (cap) cap.status = 'running';
                }
              });

              const startTime = Date.now();
              try {
                const { endpoint } = detectModelService(modelId);
                const payload = {
                  model: modelId,
                  messages: [{ role: 'user', content: prompt.prompt }],
                  temperature: 0.1,
                  max_tokens: 1024,
                  stream: false,
                  openRouterKey,
                  hfApiKey
                };

                const data = await ApiService.sendMessage(payload, endpoint, {
                  signal: controller.signal
                });
                
                const latency = Date.now() - startTime;
                const content = data.choices?.[0]?.message?.content || data.generated_text || JSON.stringify(data);
                const tokens = data.usage?.total_tokens || 0;

                set((state) => {
                  const result = state.testResults.find(r => r.model === modelId);
                  if (result) {
                    result.overallLatency += latency;
                    result.overallTokens += tokens;
                    const cap = result.capabilities.find(c => c.categoryId === prompt.id);
                    if (cap) {
                      cap.status = 'completed';
                      cap.response = content;
                      cap.latency = latency;
                      cap.tokens = tokens;
                    }
                  }
                });
              } catch (error: any) {
                if (error.name === 'AbortError') throw error;
                
                set((state) => {
                  const result = state.testResults.find(r => r.model === modelId);
                  if (result) {
                    const cap = result.capabilities.find(c => c.categoryId === prompt.id);
                    if (cap) {
                      cap.status = 'error';
                      cap.error = error.message;
                      cap.latency = Date.now() - startTime;
                    }
                  }
                });
              }

              if (i < testModels.length - 1 || j < prompts.length - 1) {
                await new Promise(r => setTimeout(r, 1000));
              }
            }

            set((state) => {
              const result = state.testResults.find(r => r.model === modelId);
              if (result) result.status = 'completed';
            });
          }
        } catch (err: any) {
          if (err.name !== 'AbortError' && err.message !== 'Aborted') {
            toast.error('Battle encountered an error: ' + err.message);
          }
        } finally {
          set((state) => {
            state.isTesting = false;
            state.abortController = null;
            state.currentTestIndex = -1;
            state.currentStepIndex = -1;
          });
          
          const state = get();
          const hasCompleted = state.testResults.some(r => r.status === 'completed');
          if (hasCompleted && !controller.signal.aborted) {
            toast.success('Battle finished. Generating AI Report...');
            get().generateAIReport({ hfApiKey });
          }
        }
      },

      generateAIReport: async ({ hfApiKey }) => {
        const { testResults } = get();
        const completedResults = testResults.filter(r => r.status === 'completed');
        if (completedResults.length < 2) return;

        set({ isAnalyzing: true });
        try {
          const reportPrompt = `
Analyze the following multi-capability model benchmark results and provide a professional comparison report. 
Highlight specific category winners (Coding, JSON, Logic) and select an overall "Battle Winner".

TEST DATA:
${completedResults.map(r => `
MODEL: ${r.model}
OVERALL LATENCY: ${r.overallLatency}ms
OVERALL TOKENS: ${r.overallTokens}
CAPABILITIES:
${r.capabilities.map(c => `- ${c.categoryName}: ${c.status === 'completed' ? 'PASS' : 'FAIL'} (${c.latency}ms)`).join('\n')}
RESPONSES (Snippets):
${r.capabilities.map(c => `[${c.categoryName}]: ${c.response?.substring(0, 200)}...`).join('\n')}
`).join('\n\n')}

FORMAT:
# Battle Audit Report
## Executive Summary
## Capability Leaderboard (Logic, Coding, JSON, etc.)
## Performance Matrix (Tokens/Sec vs Quality)
## Winner of the Battle
          `;

          const config = useConfigStore.getState();
          const payload = {
            model: config.reportModelId,
            messages: [{ role: 'user', content: reportPrompt }],
            temperature: 0.3,
            max_tokens: 2500,
            hfApiKey
          };

          const { endpoint } = detectModelService(config.reportModelId);
          const data = await ApiService.sendMessage(payload, endpoint);
          const analysis = data.choices?.[0]?.message?.content || data.generated_text || "Analysis generated.";
          set({ battleAnalysis: analysis });
        } catch (error: any) {
          console.error('Report generation failed:', error);
          set({ battleAnalysis: 'Analysis failed: ' + error.message });
        } finally {
          set({ isAnalyzing: false });
        }
      }
    })),
    {
      name: 'model-tester-battle-v2',
      partialize: (state) => ({ testModels: state.testModels }),
    }
  )
);
