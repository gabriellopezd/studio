'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
  ...props
}: {
  children: ReactNode;
  defaultTheme?: string;
  storageKey?: string;
}) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as Theme) || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    const isClient = typeof window !== 'undefined';
    
    if (!isClient) return;

    const checkTime = () => {
      const currentHour = new Date().getHours();
      // Dark mode between 6 PM (18) and 6 AM (6)
      if (currentHour >= 18 || currentHour < 6) {
        if (theme !== 'dark') setTheme('dark');
      } else {
        if (theme !== 'light') setTheme('light');
      }
    };
    
    checkTime();

    root.classList.remove('light', 'dark');
    root.classList.add(theme);

    localStorage.setItem(storageKey, theme);
    
    const interval = setInterval(checkTime, 1000 * 60 * 5); // Check every 5 minutes
    
    return () => clearInterval(interval);

  }, [theme, storageKey]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
