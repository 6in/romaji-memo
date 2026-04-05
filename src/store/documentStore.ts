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
  appendParagraph: (input: string, output: string, styleId: string) => void;
  removeParagraph: (id: string) => void;
  clearDocument: () => void;
  getExportContent: (format: 'md' | 'txt') => string;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  paragraphs: [],

  appendParagraph: (input, output, styleId) =>
    set((s) => ({
      paragraphs: [
        ...s.paragraphs,
        { id: crypto.randomUUID(), input, output, styleId, createdAt: Date.now() },
      ],
    })),

  removeParagraph: (id) =>
    set((s) => ({ paragraphs: s.paragraphs.filter((p) => p.id !== id) })),

  clearDocument: () => set({ paragraphs: [] }),

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
