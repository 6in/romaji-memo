---
created: 2026-04-06T00:00:00.000Z
title: 変換後に入力フィールドをクリアする
area: ui
files:
  - src/hooks/useConvert.ts:20
  - src/store/conversionStore.ts
---

## Problem

Cmd/Ctrl+Enter で変換しても入力フィールドにローマ字が残ったまま。
次の入力を始めるたびに手動でクリアする手間がかかる。

## Solution

`src/hooks/useConvert.ts` の `runConvert` 関数内で、
変換成功後に `setInput('')` を呼ぶ。

```ts
// useConvert.ts の setResult(result) の直後に追加
setInput('');
```

`setInput` を `useConversionStore` からデストラクチャーして使うだけ。
DocumentMode の `handleConvert` も同様に `src/components/DocumentMode.tsx:24` で
`setInput('')` を呼んでいる (こちらは既に実装済みかも確認)。
