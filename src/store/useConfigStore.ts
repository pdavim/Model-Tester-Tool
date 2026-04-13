import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ParameterPreset } from '@/types';

interface ConfigState {
  openRouterKey: string;
  hfApiKey: string;
  presets: ParameterPreset[];
  sidebarOpen: boolean;
  testMode: boolean;
  reportModelId: string;
  
  setOpenRouterKey: (key: string) => void;
  setHfApiKey: (key: string) => void;
  setPresets: (presets: ParameterPreset[]) => void;
  addPreset: (preset: ParameterPreset) => void;
  deletePreset: (id: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setTestMode: (mode: boolean) => void;
  setReportModelId: (id: string) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      openRouterKey: '',
      hfApiKey: '',
      presets: [],
      sidebarOpen: true,
      testMode: false,
      reportModelId: 'google/gemini-2.0-flash-exp:free',

      setOpenRouterKey: (openRouterKey) => set({ openRouterKey }),
      setHfApiKey: (hfApiKey) => set({ hfApiKey }),
      setPresets: (presets) => set({ presets }),
      addPreset: (preset) => set((state) => ({ presets: [...state.presets, preset] })),
      deletePreset: (id) => set((state) => ({ 
        presets: state.presets.filter(p => p.id !== id) 
      })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setTestMode: (testMode) => set({ testMode }),
      setReportModelId: (reportModelId) => set({ reportModelId }),
    }),
    {
      name: 'model-tester-config',
    }
  )
);
