import { create } from 'zustand';

export interface DocumentParagraph {
  id: string;
  input: string;
  output: string;
  styleId: string;
  createdAt: number;
}

interface DocumentStore {
  paragraphs: DocumentParagraph[];
  previewText: string | null;
  appendParagraph: (input: string, output: string, styleId: string) => void;
  removeParagraph: (id: string) => void;
  updateParagraph: (id: string, output: string) => void;
  clearDocument: () => void;
  setPreviewText: (text: string | null) => void;
  getExportContent: (format: 'md' | 'txt') => string;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  paragraphs: [],
  previewText: null,

  appendParagraph: (input, output, styleId) =>
    set((s) => ({
      paragraphs: [
        ...s.paragraphs,
        { id: crypto.randomUUID(), input, output, styleId, createdAt: Date.now() },
      ],
    })),

  removeParagraph: (id) =>
    set((s) => ({ paragraphs: s.paragraphs.filter((p) => p.id !== id) })),

  updateParagraph: (id, output) =>
    set((s) => ({
      paragraphs: s.paragraphs.map((p) => (p.id === id ? { ...p, output } : p)),
    })),

  clearDocument: () => set({ paragraphs: [], previewText: null }),

  setPreviewText: (text) => set({ previewText: text }),

  getExportContent: (format) => {
    const { paragraphs } = get();
    if (format === 'md') {
      return paragraphs
        .map((p) => `## 入力\n\n${p.input}\n\n## 変換\n\n${p.output}`)
        .join('\n\n---\n\n');
    }
    // txt: output のみを結合
    return paragraphs.map((p) => p.output).join('\n\n');
  },
}));
