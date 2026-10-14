/**
 * Тонкая типизированная обёртка над официальным window.Telegram.WebApp.
 *
 * Вне Telegram (обычный браузер, Safari на iPhone) скрипт загружается,
 * но initData пустая — тогда приложение работает в «браузерном режиме»
 * с собственными кнопками вместо нативных MainButton / BackButton.
 */

type HapticImpact = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type HapticNotification = 'error' | 'success' | 'warning';

interface TgButton {
  setParams(params: {
    text?: string;
    color?: string;
    text_color?: string;
    is_active?: boolean;
    is_visible?: boolean;
  }): void;
  show(): void;
  hide(): void;
  enable(): void;
  disable(): void;
  showProgress(leaveActive?: boolean): void;
  hideProgress(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
}

interface TgBackButton {
  show(): void;
  hide(): void;
  onClick(cb: () => void): void;
  offClick(cb: () => void): void;
}

export interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_premium?: boolean;
}

interface TgWebApp {
  initData: string;
  initDataUnsafe: { user?: TgUser; start_param?: string };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  isExpanded: boolean;
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast(version: string): boolean;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  disableVerticalSwipes?(): void;
  enableClosingConfirmation?(): void;
  disableClosingConfirmation?(): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
  showConfirm?(message: string, cb: (ok: boolean) => void): void;
  onEvent(event: string, cb: () => void): void;
  offEvent(event: string, cb: () => void): void;
  MainButton: TgButton;
  BackButton: TgBackButton;
  HapticFeedback?: {
    impactOccurred(style: HapticImpact): void;
    notificationOccurred(type: HapticNotification): void;
    selectionChanged(): void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export const tg: TgWebApp | undefined = window.Telegram?.WebApp;

/** true — приложение открыто внутри клиента Telegram */
export const isTelegram = Boolean(tg && tg.initData);

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    /* метод не поддерживается этой версией клиента */
  }
}

export function initTelegram() {
  if (!tg || !isTelegram) return;
  safe(() => tg.ready());
  safe(() => tg.expand());
  if (tg.isVersionAtLeast('7.7')) safe(() => tg.disableVerticalSwipes?.());
}

export function applyTelegramChrome(bg: string) {
  if (!tg || !isTelegram || !tg.isVersionAtLeast('6.1')) return;
  safe(() => tg.setHeaderColor(bg));
  safe(() => tg.setBackgroundColor(bg));
  if (tg.isVersionAtLeast('7.10')) safe(() => tg.setBottomBarColor?.(bg));
}

export function getTelegramUser(): TgUser | undefined {
  return tg?.initDataUnsafe?.user;
}

export function getInitData(): string {
  return tg?.initData ?? '';
}

export function getTelegramColorScheme(): 'light' | 'dark' {
  if (tg && isTelegram) return tg.colorScheme;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export const haptic = {
  impact(style: HapticImpact = 'light') {
    if (isTelegram) safe(() => tg?.HapticFeedback?.impactOccurred(style));
  },
  success() {
    if (isTelegram) safe(() => tg?.HapticFeedback?.notificationOccurred('success'));
  },
  error() {
    if (isTelegram) safe(() => tg?.HapticFeedback?.notificationOccurred('error'));
  },
  warning() {
    if (isTelegram) safe(() => tg?.HapticFeedback?.notificationOccurred('warning'));
  },
  selection() {
    if (isTelegram) safe(() => tg?.HapticFeedback?.selectionChanged());
  },
};

export function openExternalLink(url: string) {
  if (tg && isTelegram) safe(() => tg.openLink(url));
  else window.open(url, '_blank', 'noopener');
}
