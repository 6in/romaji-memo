import { create } from 'zustand';
import type { ConvertResult } from '../lib/tauri';

interface ConversionState {
  input: string;
  result: ConvertResult | null;
  loading: boolean;
  error: string | null;
  selectedStyleId: string;
  setInput: (input: string) => void;
  setResult: (result: ConvertResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedStyleId: (id: string) => void;
}

export const useConversionStore = create<ConversionState>((set) => ({
  input: '',
  result: null,
  loading: false,
  error: null,
  selectedStyleId: 'standard',
  setInput: (input) => set({ input }),
  setResult: (result) => set({ result, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedStyleId: (id) => set({ selectedStyleId: id }),
}));
