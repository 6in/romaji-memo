import { create } from 'zustand';

interface SettingsState {
  theme: 'dark' | 'light';
  alwaysOnTop: boolean;
  activeProviderId: string;
  historyLimit: number;
  setTheme: (theme: 'dark' | 'light') => void;
  setAlwaysOnTop: (value: boolean) => void;
  setActiveProviderId: (id: string) => void;
  toggleTheme: () => void;
  setHistoryLimit: (limit: number) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark', // D-15: dark-green default
  alwaysOnTop: true, // tauri.conf.json default
  activeProviderId: 'anthropic', // providers.json default
  historyLimit: 1000,
  setTheme: (theme) => set({ theme }),
  setAlwaysOnTop: (value) => set({ alwaysOnTop: value }),
  setActiveProviderId: (id) => set({ activeProviderId: id }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'dark' ? 'light' : 'dark',
    })),
  setHistoryLimit: (limit) => set({ historyLimit: limit }),
}));
