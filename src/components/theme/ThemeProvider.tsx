'use client';
import { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'dark',
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default 'dark', tapi langsung sync dari localStorage saat mount.
  // Ini mencegah mismatch antara anti-flash script (yang inject ke <html>)
  // dan state React.
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Sync state dari apa yang sudah di-inject oleh anti-flash script
    const saved = localStorage.getItem('pustara_theme') as Theme | null;
    const resolved: Theme = saved === 'light' ? 'light' : 'dark';
    setTheme(resolved);
    // Pastiin class di <html> sesuai (jaga-jaga kalau script belum jalan)
    applyToHtml(resolved);
  }, []);

  function toggle() {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('pustara_theme', next);
      applyToHtml(next);
      return next;
    });
  }

  return (
    <ThemeCtx.Provider value={{ theme, toggle }}>
      {/* Tidak perlu wrapper div lagi — class diapply langsung ke <html> */}
      {children}
    </ThemeCtx.Provider>
  );
}

function applyToHtml(theme: Theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
}

export const useTheme = () => useContext(ThemeCtx);