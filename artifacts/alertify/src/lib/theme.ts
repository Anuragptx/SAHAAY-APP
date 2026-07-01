/**
 * theme.ts
 * Manages light/dark mode preference.
 * Persists to localStorage and applies the `.dark` class on <html>.
 */
import { useState, useEffect } from 'react';

type ThemePreference = 'light' | 'dark';

const STORAGE_KEY = 'alertify_theme';

function getInitialPreference(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  // Fall back to OS preference
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(getInitialPreference);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleDark = () => setIsDark((d) => !d);

  return { isDark, toggleDark };
}
