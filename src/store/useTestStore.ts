import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiService } from '@/services/api.service';
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
  currentTestIndex: number; // Index of the model being tested
  currentStepIndex: number; // Index of the capability being tested
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
    (set, get) => ({
      testModels: [],
      testResults: [],
      isTesting: false,
      isAnalyzing: false,
      currentTestIndex: -1,
      currentStepIndex: -1,
      battleAnalysis: null,
      abortController: null,

      addModelToTest: (id) => set((state) => {
        if (state.testModels.includes(id)) return state;
        if (state.testModels.length >= 10) {
          toast.error('Maximum 10 models for Battle Mode');
          return state;
        }
        return { testModels: [...state.testModels, id] };
      }),

      removeModelFromTest: (id) => set((state) => ({
        testModels: state.testModels.filter(m => m !== id)
      })),

      setTestModels: (testModels) => set({ testModels }),

      clearResults: () => set({ testResults: [], battleAnalysis: null, currentTestIndex: -1, currentStepIndex: -1 }),

      stopBattle: () => {
        const { abortController } = get();
        if (abortController) {
          abortController.abort();
          set({ isTesting: false, abortController: null });
          toast.info('Battle stopped by user');
        }
      },

      runTestBatch: async (prompts, { openRouterKey, hfApiKey }) => {
        const { testModels } = get();
        if (testModels.length === 0) return;

        const controller = new AbortController();
        
        set({ 
          isTesting: true, 
          abortController: controller,
          testResults: testModels.map(id => ({ 
            model: id, 
            status: 'pending',
            overallLatency: 0,
            overallTokens: 0,
            capabilities: prompts.map(p => ({
              categoryId: p.id,
              categoryName: p.category,
              status: 'pending',
              latency: 0,
              tokens: 0
            }))
          })),
          battleAnalysis: null,
          currentTestIndex: 0,
          currentStepIndex: 0
        });

        try {
          for (let i = 0; i < testModels.length; i++) {
            const modelId = testModels[i];
            set({ currentTestIndex: i });

            for (let j = 0; j < prompts.length; j++) {
              if (controller.signal.aborted) throw new Error('Aborted');
              
              const prompt = prompts[j];
              set({ currentStepIndex: j });

              // Update status to running for this specific capability
              set((state) => ({
                testResults: state.testResults.map(r => r.model === modelId ? {
                  ...r,
                  status: 'running',
                  capabilities: r.capabilities.map(c => c.categoryId === prompt.id ? { ...c, status: 'running' } : c)
                } : r)
              }));

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

                const data = await ApiService.sendMessage(payload, endpoint);
                const latency = Date.now() - startTime;
                const content = data.choices?.[0]?.message?.content || data.generated_text || JSON.stringify(data);
                const tokens = data.usage?.total_tokens || 0;

                set((state) => ({
                  testResults: state.testResults.map(r => r.model === modelId ? {
                    ...r,
                    overallLatency: r.overallLatency + latency,
                    overallTokens: r.overallTokens + tokens,
                    capabilities: r.capabilities.map(c => c.categoryId === prompt.id ? {
                      ...c,
                      status: 'completed',
                      response: content,
                      latency,
                      tokens
                    } : c)
                  } : r)
                }));
              } catch (error: any) {
                console.error(`Capability ${prompt.category} failed for ${modelId}:`, error);
                set((state) => ({
                  testResults: state.testResults.map(r => r.model === modelId ? {
                    ...r,
                    capabilities: r.capabilities.map(c => c.categoryId === prompt.id ? {
                      ...c,
                      status: 'error',
                      error: error.message,
                      latency: Date.now() - startTime
                    } : c)
                  } : r)
                }));
              }

              // Mini cooldown between capabilities
              await new Promise(r => setTimeout(r, 1000));
            }

            // Mark model as completed
            set((state) => ({
              testResults: state.testResults.map(r => r.model === modelId ? { ...r, status: 'completed' } : r)
            }));

            // Cooldown between models
            if (i < testModels.length - 1) {
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        } catch (err: any) {
          if (err.message !== 'Aborted') {
            toast.error('Battle encountered an error: ' + err.message);
          }
        } finally {
          set({ isTesting: false, abortController: null, currentTestIndex: -1, currentStepIndex: -1 });
          const hasCompleted = get().testResults.some(r => r.status === 'completed');
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

          const payload = {
            model: 'zai-org/GLM-5.1',
            messages: [{ role: 'user', content: reportPrompt }],
            temperature: 0.3,
            max_tokens: 2500,
            hfApiKey
          };

          // FIXED: Use /api/hf/chat for the chat model
          const data = await ApiService.sendMessage(payload, '/api/hf/chat');
          const analysis = data.choices?.[0]?.message?.content || data.generated_text || "Analysis generated.";
          set({ battleAnalysis: analysis });
        } catch (error: any) {
          console.error('Report generation failed:', error);
          set({ battleAnalysis: 'Analysis failed: ' + error.message });
        } finally {
          set({ isAnalyzing: false });
        }
      }
    }),
    {
      name: 'model-tester-battle-v2', // Changed name to reset versioning
      partialize: (state) => ({ testModels: state.testModels }),
    }
  )
);
