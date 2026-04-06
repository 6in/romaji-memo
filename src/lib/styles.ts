export interface StylePreset {
  id: string;
  label: string;
  emoji: string;
}

export const BUILT_IN_STYLES: StylePreset[] = [
  { id: 'standard', label: '標準', emoji: '📝' },
  { id: 'polite', label: '丁寧', emoji: '🎩' },
  { id: 'osaka', label: '大阪弁', emoji: '🐡' },
  { id: 'okama', label: 'おかま', emoji: '💅' },
  { id: 'bushi', label: '武士', emoji: '⚔️' },
  { id: 'gal', label: 'ギャル', emoji: '✌️' },
  { id: 'business', label: 'ビジネス', emoji: '💼' },
  { id: 'prompt', label: '英語', emoji: '🇺🇸' },
];

/** ビルトインスタイルか判定 */
export function isBuiltInStyle(styleId: string): boolean {
  return BUILT_IN_STYLES.some((s) => s.id === styleId);
}
