import { create } from 'zustand';
import { get as getIDB, set as setIDB } from 'idb-keyval';

interface SearchState {
  history: string[];
  addToHistory: (query: string) => void;
  clearHistory: () => void;
  loadHistory: () => Promise<void>;
}

const STORAGE_KEY = 'model-tester-search-history';

export const useSearchStore = create<SearchState>((set, get) => ({
  history: [],

  addToHistory: async (query) => {
    if (!query.trim()) return;
    
    set((state) => {
      const filtered = state.history.filter(q => q !== query);
      const newHistory = [query, ...filtered].slice(0, 20); // Keep last 20 queries
      
      // Persist to IDB
      setIDB(STORAGE_KEY, newHistory).catch(err => 
        console.error('Failed to persist search history:', err)
      );
      
      return { history: newHistory };
    });
  },

  clearHistory: async () => {
    set({ history: [] });
    await setIDB(STORAGE_KEY, []);
  },

  loadHistory: async () => {
    try {
      const saved = await getIDB<string[]>(STORAGE_KEY);
      if (saved) set({ history: saved });
    } catch (err) {
      console.error('Failed to load search history:', err);
    }
  }
}));
