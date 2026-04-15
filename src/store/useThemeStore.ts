import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      toggleTheme: () => {
        const current = get().theme;
        let next: 'light' | 'dark' | 'system';
        
        if (current === 'system') {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          next = isDark ? 'light' : 'dark';
        } else {
          next = current === 'dark' ? 'light' : 'dark';
        }
        
        set({ theme: next });
        applyTheme(next);
      },
    }),
    {
      name: 'model-tester-theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);

function applyTheme(theme: 'light' | 'dark' | 'system') {
  if (typeof window === 'undefined') return;

  const root = window.document.documentElement;
  const isDark = 
    theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}
