---
created: 2026-04-06T00:00:00.000Z
title: コピーボタンのエラー修正と変換後の自動クリップボードコピー
area: ui
files:
  - src/components/ResultDisplay.tsx:19-29
  - src/hooks/useConvert.ts
---

## Problem

**問題 1: コピーボタンでエラーが発生する**

`ResultDisplay.tsx` の `handleCopy` が `writeText` を呼ぶとエラーになる。
`writeText` は `@tauri-apps/plugin-clipboard-manager` から import しているが、
`tauri-plugin-clipboard` (CrossCopy, 監視用) と `tauri-plugin-clipboard-manager` (公式, 読み書き用)
が同時に動いており、競合している可能性がある。

また `clipboard-manager:default` capability は設定済みだが、
Rust 側で `tauri_plugin_clipboard_manager::init()` の初期化順や
plugin feature flags が原因の可能性もある。

**問題 2: 変換後に自動でクリップボードにコピーしてほしい**

変換が完了したら手動でコピーボタンを押さなくても自動でクリップボードにコピーされるとよい。

## Solution

**問題 1:**
1. `tauri dev` 起動時のコンソールエラーを確認し原因を特定
2. `tauri-plugin-clipboard-manager` の `writeText` と CrossCopy の競合を調査
3. 必要なら `writeText` の代わりに CrossCopy の write API (`writeImageBase64` ではなく `writeText` from `tauri-plugin-clipboard-api`) に統一する

**問題 2:**
`src/hooks/useConvert.ts` の `setResult(result)` の直後に自動コピーを追加:

```ts
// useConvert.ts
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
// ...
setResult(result);
setClipboardIgnoreUntil(Date.now() + 1000);  // 自己コピー防止
await writeText(result.converted);
```

ただし問題 1 のエラーが解消されてから実装すること。
