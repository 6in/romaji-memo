---
created: 2026-04-06T00:00:00.000Z
title: 変換結果をインライン編集できるようにする
area: ui
files:
  - src/components/ResultDisplay.tsx:36-37
  - src/store/conversionStore.ts
---

## Problem

変換結果が `<div>` の読み取り専用テキストで表示されており、
AI の出力に誤りがあっても直接修正できない。
コピーしてから別のアプリで編集する必要があり、手間がかかる。

## Solution

`ResultDisplay.tsx` の結果表示部分を `<div>` から `<textarea>` (または `contentEditable`) に変更し、
インライン編集を可能にする。

**実装方針:**

1. `conversionStore` に `editedResult: string | null` を追加（`null` = AI 出力そのまま）
2. `ResultDisplay` の結果表示を `<textarea>` に変更:
   ```tsx
   <textarea
     value={editedResult ?? result.converted}
     onChange={(e) => setEditedResult(e.target.value)}
     className="p-3 bg-muted rounded-md text-foreground text-sm leading-relaxed w-full resize-none"
     rows={...}  // 内容に合わせて自動調整
     autoComplete="off" autoCorrect="off" spellCheck={false}
   />
   ```
3. コピーボタンは `editedResult ?? result.converted` をコピーする
4. バッファ追加も同様に編集済みテキストを使う
5. 新しい変換が来たら `editedResult` を `null` にリセット

**UX 考慮点:**
- 編集中であることを示す視覚的なインジケーター（border color 変更など）
- 編集後に再変換ボタンを押したら `editedResult` はリセット
