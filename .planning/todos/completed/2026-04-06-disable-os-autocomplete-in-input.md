---
created: 2026-04-06T00:00:00.000Z
title: 入力フィールドの OS 自動補完・スペルチェックを無効化
area: ui
files:
  - src/components/Converter.tsx:46
---

## Problem

ローマ字を入力中に OS の入力補完 (macOS の自動修正・スペルチェック) が働き、
英語の単語に勝手に変換されることがある。
ローマ字はそのまま AI に渡す必要があるため、OS による変換は誤動作の原因となる。

## Solution

`<textarea>` に以下の HTML 属性を追加して OS の補完機能を無効化する:

```tsx
autoComplete="off"
autoCorrect="off"
autoCapitalize="off"
spellCheck={false}
```

`src/components/Converter.tsx` の `<textarea>` 要素 (L46 付近) に追加するだけで対応可能。
