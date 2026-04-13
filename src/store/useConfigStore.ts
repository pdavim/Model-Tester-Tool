import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ParameterPreset } from '@/types';

interface ConfigState {
  openRouterKey: string;
  hfApiKey: string;
  presets: ParameterPreset[];
  sidebarOpen: boolean;
  testMode: boolean;
  
  setOpenRouterKey: (key: string) => void;
  setHfApiKey: (key: string) => void;
  setPresets: (presets: ParameterPreset[]) => void;
  addPreset: (preset: ParameterPreset) => void;
  deletePreset: (id: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setTestMode: (mode: boolean) => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      openRouterKey: '',
      hfApiKey: '',
      presets: [],
      sidebarOpen: true,
      testMode: false,

      setOpenRouterKey: (openRouterKey) => set({ openRouterKey }),
      setHfApiKey: (hfApiKey) => set({ hfApiKey }),
      setPresets: (presets) => set({ presets }),
      addPreset: (preset) => set((state) => ({ presets: [...state.presets, preset] })),
      deletePreset: (id) => set((state) => ({ 
        presets: state.presets.filter(p => p.id !== id) 
      })),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setTestMode: (testMode) => set({ testMode }),
    }),
    {
      name: 'model-tester-config',
    }
  )
);
