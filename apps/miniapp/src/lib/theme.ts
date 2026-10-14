import { useEffect, useState } from 'react';
import { useUi } from '../store/ui';
import { applyTelegramChrome, getTelegramColorScheme, isTelegram, tg } from './telegram';

export type ResolvedTheme = 'dark' | 'light';

const BG: Record<ResolvedTheme, string> = { dark: '#0A0A0C', light: '#F5F3EE' };

export function useResolvedTheme(): ResolvedTheme {
  const pref = useUi((s) => s.theme);
  const [scheme, setScheme] = useState<ResolvedTheme>(getTelegramColorScheme);

  useEffect(() => {
    const app = tg;
    if (!app || !isTelegram) return;
    const onChange = () => setScheme(app.colorScheme);
    app.onEvent('themeChanged', onChange);
    return () => app.offEvent('themeChanged', onChange);
  }, []);

  return pref === 'auto' ? scheme : pref;
}

/** Применяет тему к документу и красит шапку/фон Telegram в цвет приложения */
export function useApplyTheme() {
  const theme = useResolvedTheme();
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BG[theme]);
    applyTelegramChrome(BG[theme]);
  }, [theme]);
  return theme;
}
