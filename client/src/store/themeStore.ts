import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  // Computed property to get the actual active theme (resolves 'system')
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      isDark: false, // Calculated dynamically on mount
      setTheme: (theme) => set({ theme }),
      setIsDark: (isDark) => set({ isDark }),
    }),
    {
      name: 'theme-storage',
    }
  )
);
