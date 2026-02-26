import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';

export const ThemeToggle = () => {
  const { isDark, setTheme } = useThemeStore();

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm border border-slate-200 dark:border-slate-700/60 focus:outline-none"
      title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
    >
      <div className="relative w-5 h-5 overflow-hidden flex items-center justify-center">
        <Sun className={`absolute w-5 h-5 transition-all duration-300 transform ${isDark ? 'translate-y-8 opacity-0' : 'translate-y-0 opacity-100'}`} />
        <Moon className={`absolute w-5 h-5 transition-all duration-300 transform ${isDark ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'}`} />
      </div>
    </button>
  );
};
