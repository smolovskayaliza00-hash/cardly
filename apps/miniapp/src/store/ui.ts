import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePref = 'auto' | 'dark' | 'light';

interface UiState {
  onboarded: boolean;
  hideBalance: boolean;
  theme: ThemePref;
  setOnboarded(v: boolean): void;
  toggleHideBalance(): void;
  setTheme(t: ThemePref): void;
}

const safeStorage = createJSONStorage(() => {
  try {
    const k = '__probe__';
    localStorage.setItem(k, k);
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  }
});

export const useUi = create<UiState>()(
  persist(
    (set) => ({
      onboarded: false,
      hideBalance: false,
      theme: 'dark',
      setOnboarded: (v) => set({ onboarded: v }),
      toggleHideBalance: () => set((s) => ({ hideBalance: !s.hideBalance })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'aurum-ui', storage: safeStorage },
  ),
);

interface ToastState {
  message: string | null;
  tone: 'default' | 'success' | 'error';
  show(message: string, tone?: ToastState['tone']): void;
  hide(): void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  message: null,
  tone: 'default',
  show: (message, tone = 'default') => {
    clearTimeout(toastTimer);
    set({ message, tone });
    toastTimer = setTimeout(() => set({ message: null }), 2_600);
  },
  hide: () => set({ message: null }),
}));

export const toast = (message: string, tone?: ToastState['tone']) => useToast.getState().show(message, tone);
