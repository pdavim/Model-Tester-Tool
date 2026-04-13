import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Model } from '@/types';
import { ApiService } from '@/services/api.service';
import { useConfigStore } from './useConfigStore';

interface ModelState {
  models: Model[];
  customModels: Model[];
  favorites: string[];
  hfHubModels: Model[];
  isLoadingModels: boolean;
  isSearchingHub: boolean;
  
  // Filter state
  searchQuery: string;
  selectedService: 'all' | 'openrouter' | 'huggingface';
  filterFree: boolean;
  filterPaid: boolean;
  filterModality: string[];
  filterTags: string[];
  filterProviders: string[];
  filterFavorites: boolean;
  filterSelected: boolean;
  sortBy: 'name' | 'created' | 'context';
  sortOrder: 'asc' | 'desc';

  // Actions
  setModels: (models: Model[]) => void;
  fetchModels: () => Promise<void>;
  searchHFModels: (query: string) => Promise<void>;
  addCustomModel: (model: Model) => void;
  deleteCustomModel: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedService: (service: 'all' | 'openrouter' | 'huggingface') => void;
  setFilterFree: (val: boolean) => void;
  setFilterPaid: (val: boolean) => void;
  setFilterModality: (val: string[]) => void;
  setFilterTags: (val: string[]) => void;
  setFilterProviders: (val: string[]) => void;
  setFilterFavorites: (val: boolean) => void;
  setFilterSelected: (val: boolean) => void;
  setSortBy: (val: 'name' | 'created' | 'context') => void;
  setSortOrder: (val: 'asc' | 'desc') => void;
  clearFilters: () => void;
}

export const useModelStore = create<ModelState>()(
  persist(
    (set, get) => ({
      models: [],
      customModels: [],
      favorites: [],
      hfHubModels: [],
      isLoadingModels: false,
      isSearchingHub: false,

      searchQuery: '',
      selectedService: 'all',
      filterFree: false,
      filterPaid: false,
      filterModality: [],
      filterTags: [],
      filterProviders: [],
      filterFavorites: false,
      filterSelected: false,
      sortBy: 'name',
      sortOrder: 'desc',

      setModels: (models) => set({ models }),
      
      fetchModels: async () => {
        set({ isLoadingModels: true });
        try {
          const { hfApiKey } = useConfigStore.getState();
          const models = await ApiService.fetchModels(hfApiKey);
          set({ models });
        } finally {
          set({ isLoadingModels: false });
        }
      },

      searchHFModels: async (query) => {
        set({ isSearchingHub: true });
        try {
          const { hfApiKey } = useConfigStore.getState();
          const models = await ApiService.searchHFHub(query, hfApiKey);
          set({ hfHubModels: models });
        } finally {
          set({ isSearchingHub: false });
        }
      },

      addCustomModel: (model) => set((state) => ({ 
        customModels: [...state.customModels, { ...model, isCustom: true, provider: 'huggingface' }] 
      })),

      deleteCustomModel: (id) => set((state) => ({ 
        customModels: state.customModels.filter(m => m.id !== id) 
      })),

      toggleFavorite: (id) => set((state) => {
        const isFav = state.favorites.includes(id);
        return {
          favorites: isFav ? state.favorites.filter(f => f !== id) : [...state.favorites, id]
        };
      }),

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setSelectedService: (selectedService) => set({ selectedService }),
      setFilterFree: (filterFree) => set({ filterFree }),
      setFilterPaid: (filterPaid) => set({ filterPaid }),
      setFilterModality: (filterModality) => set({ filterModality }),
      setFilterTags: (filterTags) => set({ filterTags }),
      setFilterProviders: (filterProviders) => set({ filterProviders }),
      setFilterFavorites: (filterFavorites) => set({ filterFavorites }),
      setFilterSelected: (filterSelected) => set({ filterSelected }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      
      clearFilters: () => set({
        searchQuery: '',
        filterFree: false,
        filterPaid: false,
        filterModality: [],
        filterTags: [],
        filterProviders: [],
        filterFavorites: false,
        filterSelected: false,
      })
    }),
    {
      name: 'model-tester-models',
      partialize: (state) => ({ 
        favorites: state.favorites, 
        customModels: state.customModels 
      }),
    }
  )
);
