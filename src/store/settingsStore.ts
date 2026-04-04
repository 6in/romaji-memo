import { create } from 'zustand';

interface SettingsState {
  activeProviderId: string;
  theme: 'dark' | 'light';
  alwaysOnTop: boolean;
  setActiveProviderId: (id: string) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setAlwaysOnTop: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  activeProviderId: 'default',
  theme: 'dark',
  alwaysOnTop: true,
  setActiveProviderId: (id) => set({ activeProviderId: id }),
  setTheme: (theme) => set({ theme }),
  setAlwaysOnTop: (value) => set({ alwaysOnTop: value }),
}));
