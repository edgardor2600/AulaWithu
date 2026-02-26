import { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { theme, setIsDark } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      setIsDark(systemTheme === 'dark');
      return;
    }

    root.classList.add(theme);
    setIsDark(theme === 'dark');
  }, [theme, setIsDark]);

  useEffect(() => {
     // Escuchar cambios de sistema si estamos en modo system
     const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
     const handleChange = (e: MediaQueryListEvent) => {
        if (useThemeStore.getState().theme === 'system') {
           const root = window.document.documentElement;
           root.classList.remove('light', 'dark');
           root.classList.add(e.matches ? 'dark' : 'light');
           useThemeStore.getState().setIsDark(e.matches);
        }
     };

     mediaQuery.addEventListener('change', handleChange);
     return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return <>{children}</>;
};
