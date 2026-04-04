import { create } from 'zustand';

interface HistoryState {
  isDrawerOpen: boolean;
  toggleDrawer: () => void;
  setDrawerOpen: (open: boolean) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  isDrawerOpen: false,
  toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),
  setDrawerOpen: (open) => set({ isDrawerOpen: open }),
}));
