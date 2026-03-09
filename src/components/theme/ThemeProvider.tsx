'use client';
import { createContext, useContext, useState } from 'react';

type Theme = 'dark' | 'light';

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  return (
    <ThemeCtx.Provider value={{ theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }}>
      <div className={theme === 'light' ? 'light' : ''} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);