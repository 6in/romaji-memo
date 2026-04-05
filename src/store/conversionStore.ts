import { create } from 'zustand';
import type { ConvertResult } from '../lib/tauri';

interface ConversionState {
  input: string;
  result: ConvertResult | null;
  editedResult: string | null; // null = use AI output as-is
  loading: boolean;
  error: string | null;
  selectedStyleId: string;
  // WINX-05: mini-mode
  isMiniMode: boolean;
  savedSize: { width: number; height: number } | null;
  // WINX-06: clipboard watch
  isClipboardWatching: boolean;
  clipboardIgnoreUntil: number; // timestamp: ignore clipboard callbacks until this time
  // CONV-08: document mode
  isDocumentMode: boolean;
  setInput: (input: string) => void;
  setResult: (result: ConvertResult | null) => void;
  setEditedResult: (text: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedStyleId: (id: string) => void;
  setMiniMode: (mini: boolean) => void;
  setSavedSize: (size: { width: number; height: number } | null) => void;
  setClipboardWatching: (watching: boolean) => void;
  setClipboardIgnoreUntil: (ts: number) => void;
  setDocumentMode: (mode: boolean) => void;
}

export const useConversionStore = create<ConversionState>((set) => ({
  input: '',
  result: null,
  editedResult: null,
  loading: false,
  error: null,
  selectedStyleId: 'standard',
  isMiniMode: false,
  savedSize: null,
  isClipboardWatching: false,
  clipboardIgnoreUntil: 0,
  isDocumentMode: false,
  setInput: (input) => set({ input }),
  setResult: (result) => set({ result, error: null, editedResult: null }),
  setEditedResult: (text) => set({ editedResult: text }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedStyleId: (id) => set({ selectedStyleId: id }),
  setMiniMode: (mini) => set({ isMiniMode: mini }),
  setSavedSize: (size) => set({ savedSize: size }),
  setClipboardWatching: (watching) => set({ isClipboardWatching: watching }),
  setClipboardIgnoreUntil: (ts) => set({ clipboardIgnoreUntil: ts }),
  setDocumentMode: (mode) => set({ isDocumentMode: mode }),
}));
