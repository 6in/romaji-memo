import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';

export interface BufferItem {
  id: string;
  text: string;
  styleId: string;
  createdAt: number;
}

interface BufferStore {
  items: BufferItem[];
  addItem: (text: string, styleId: string) => void;
  removeItem: (id: string) => void;
  reorder: (oldIndex: number, newIndex: number) => void;
  copyAll: () => string;
  clear: () => void;
}

export const useBufferStore = create<BufferStore>((set, get) => ({
  items: [],
  addItem: (text, styleId) =>
    set((s) => ({
      items: [...s.items, { id: crypto.randomUUID(), text, styleId, createdAt: Date.now() }],
    })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  reorder: (oldIndex, newIndex) =>
    set((s) => ({ items: arrayMove(s.items, oldIndex, newIndex) })),
  copyAll: () => get().items.map((i) => i.text).join('\n\n'),
  clear: () => set({ items: [] }),
}));
