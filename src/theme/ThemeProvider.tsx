import { useEffect } from 'react';
import type { AccentColor, ThemeMode } from '@/types';

/**
 * Applies theme + accent to the document root by setting `data-theme` and
 * `data-accent` (consumed by CSS variables in globals.css). Resolves the
 * `system` theme reactively via `matchMedia`. Renders nothing.
 */
export function ThemeProvider({
  theme,
  accent,
  children,
}: {
  theme: ThemeMode;
  accent: AccentColor;
  children?: React.ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = (): void => {
      const resolved =
        theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme;
      root.setAttribute('data-theme', resolved);
    };

    apply();
    if (theme === 'system') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
    return undefined;
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
  }, [accent]);

  return <>{children}</>;
}
