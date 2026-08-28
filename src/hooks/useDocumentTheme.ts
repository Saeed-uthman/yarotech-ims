import { useEffect } from 'react';
import { AppTheme } from '../types';

const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';

export function applyDocumentTheme(theme: AppTheme): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia(DARK_MODE_QUERY).matches);

  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
}

export function useDocumentTheme(theme?: AppTheme): void {
  useEffect(() => {
    if (!theme) return;

    const colorScheme = window.matchMedia(DARK_MODE_QUERY);
    const syncTheme = () => applyDocumentTheme(theme);

    syncTheme();

    if (theme !== 'system') return;

    colorScheme.addEventListener('change', syncTheme);
    return () => colorScheme.removeEventListener('change', syncTheme);
  }, [theme]);
}
