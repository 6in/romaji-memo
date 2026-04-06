---
created: 2026-04-06T02:15:32.504Z
title: 超文書モードで変換テキスト追加時に自動スクロール・新規会話ボタンでテキストクリア
area: ui
files:
  - src/components/DocumentMode.tsx
---

## Problem

超文書モード（DocumentMode）に2つのUX問題がある：

1. **自動スクロールなし**: 変換されたテキストが段落に追加されるたびに、ユーザーが手動でスクロールしないと最新テキストが見えない。長文書を書いている際に不便。

2. **新規会話ボタンでテキストが残る**: TitleBarの「新しい会話」ボタン（`new_conversation` コマンド）を押しても、DocumentModeに表示されているテキストがクリアされない。DBのストッパーは挿入されるが、UIの表示内容はそのまま残ってしまう。

## Solution

**自動スクロール:**
- `DocumentMode.tsx` のテキストエリアまたはスクロールコンテナに `ref` を付与
- テキストが追加されるたびに `useEffect` で `scrollTop = scrollHeight` を実行
- 条件: ユーザーが手動でスクロールアップしている場合は自動スクロールを無効化（オプション）

**新規会話ボタンでテキストクリア:**
- `TitleBar.tsx` の `newConversation` 呼び出し後にDocumentModeの状態をリセットするイベントを発火
- または `documentStore.ts` にクリアアクションを追加し、TitleBarから`invoke("new_conversation")`後に`clearDocument()`を呼ぶ
- 実装方法: Zustandのdocumentストアに `clearDocument()` アクションを追加し、TitleBarからトリガー
