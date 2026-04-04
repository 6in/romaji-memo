import { create } from 'zustand';

interface SettingsState {
  theme: 'dark' | 'light';
  alwaysOnTop: boolean;
  activeProviderId: string;
  setTheme: (theme: 'dark' | 'light') => void;
  setAlwaysOnTop: (value: boolean) => void;
  setActiveProviderId: (id: string) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark', // D-15: dark-green default
  alwaysOnTop: true, // tauri.conf.json default
  activeProviderId: 'anthropic', // providers.json default
  setTheme: (theme) => set({ theme }),
  setAlwaysOnTop: (value) => set({ alwaysOnTop: value }),
  setActiveProviderId: (id) => set({ activeProviderId: id }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'dark' ? 'light' : 'dark',
    })),
}));
