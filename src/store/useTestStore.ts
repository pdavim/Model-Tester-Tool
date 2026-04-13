import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiService } from '@/services/api.service';
import { detectModelService } from '@/lib/model-utils';
import { Model } from '@/types';
import { toast } from 'sonner';

export interface TestResult {
  model: string;
  latency: number;
  tokens: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  response?: string;
  error?: string;
  usage?: any;
}

interface TestState {
  testModels: string[];
  testResults: TestResult[];
  isTesting: boolean;
  isAnalyzing: boolean;
  currentTestIndex: number;
  battleAnalysis: string | null;
  
  // Actions
  addModelToTest: (id: string) => void;
  removeModelFromTest: (id: string) => void;
  setTestModels: (ids: string[]) => void;
  clearResults: () => void;
  runTestBatch: (prompt: string, config: { openRouterKey: string; hfApiKey: string }) => Promise<void>;
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
      battleAnalysis: null,

      addModelToTest: (id) => set((state) => {
        if (state.testModels.includes(id)) return state;
        if (state.testModels.length >= 10) {
          toast.error('Maximum 10 models for battle Mode');
          return state;
        }
        return { testModels: [...state.testModels, id] };
      }),

      removeModelFromTest: (id) => set((state) => ({
        testModels: state.testModels.filter(m => m !== id)
      })),

      setTestModels: (testModels) => set({ testModels }),

      clearResults: () => set({ testResults: [], battleAnalysis: null, currentTestIndex: -1 }),

      runTestBatch: async (prompt, { openRouterKey, hfApiKey }) => {
        const { testModels } = get();
        if (testModels.length === 0) return;

        set({ 
          isTesting: true, 
          testResults: testModels.map(id => ({ model: id, latency: 0, tokens: 0, status: 'pending' })),
          battleAnalysis: null,
          currentTestIndex: 0
        });

        for (let i = 0; i < testModels.length; i++) {
          const modelId = testModels[i];
          const startTime = Date.now();
          
          set({ currentTestIndex: i });
          set((state) => ({
            testResults: state.testResults.map(r => r.model === modelId ? { ...r, status: 'running' } : r)
          }));

          try {
            const { endpoint } = detectModelService(modelId);
            
            const payload = {
              model: modelId,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.1, // Fixed for consistency
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
                status: 'completed',
                response: content,
                latency,
                tokens,
                usage: data.usage
              } : r)
            }));
          } catch (error: any) {
            set((state) => ({
              testResults: state.testResults.map(r => r.model === modelId ? {
                ...r,
                status: 'error',
                error: error.message
              } : r)
            }));
          }

          // Cooldown
          if (i < testModels.length - 1) {
            await new Promise(r => setTimeout(r, 2000));
          }
        }

        set({ isTesting: false, currentTestIndex: -1 });
        toast.success('Battle finished. Generating AI Report...');
        
        // Auto-generate report after battle
        get().generateAIReport({ hfApiKey });
      },

      generateAIReport: async ({ hfApiKey }) => {
        const { testResults } = get();
        if (testResults.filter(r => r.status === 'completed').length < 2) return;

        set({ isAnalyzing: true });
        try {
          // Format the results into a professional prompt for GLM-5.1
          const reportPrompt = `
Analyze the following model benchmark results and provide a comprehensive comparison report. 
Highlight strengths, weaknesses, and select a "Winner" for the given task.

TEST RESULTS:
${testResults.filter(r => r.status === 'completed').map(r => `
---
MODEL: ${r.model}
LATENCY: ${r.latency}ms
TOKENS: ${r.tokens}
RESPONSE: ${r.response?.substring(0, 500)}...
`).join('\n')}

Format your output as follows:
# Battle Report
## Comparative Summary
## Performance Analysis (Latency vs Quality)
## Detailed Critiques
### [Model Name]
...
## The Winner
          `;

          const payload = {
            model: 'zai-org/GLM-5.1',
            messages: [{ role: 'user', content: reportPrompt }],
            temperature: 0.3,
            max_tokens: 2048,
            hfApiKey
          };

          const data = await ApiService.sendMessage(payload, '/api/hf/inference');
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
      name: 'model-tester-battle',
      partialize: (state) => ({ testModels: state.testModels }),
    }
  )
);
