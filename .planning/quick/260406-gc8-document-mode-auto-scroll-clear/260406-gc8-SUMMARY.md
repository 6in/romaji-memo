---
phase: quick-260406-gc8
plan: "01"
subsystem: frontend-ui
tags: [document-mode, ux, auto-scroll, state-management]
dependency_graph:
  requires: []
  provides: [document-mode-auto-scroll, new-conversation-full-clear]
  affects: [DocumentMode, TitleBar, documentStore, conversionStore]
tech_stack:
  added: []
  patterns: [useRef-scrollIntoView, zustand-cross-store-action]
key_files:
  modified:
    - src/components/DocumentMode.tsx
    - src/components/TitleBar.tsx
decisions:
  - "paragraphs.length を useEffect 依存配列に使用し、編集時スクロールを防止"
  - "TitleBar から useDocumentStore を直接参照し、clearDocument を取得"
metrics:
  duration: "約10分"
  completed_date: "2026-04-06"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 260406-gc8: 長文書モード自動スクロール＋新規会話クリア Summary

**One-liner:** paragraphs.length 監視の useEffect で scrollIntoView を呼ぶ自動スクロールと、新規会話ボタンで documentStore・conversionStore を両方クリアする UX 修正。

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | DocumentMode 段落追加時の自動スクロール | 9adc3e8 | src/components/DocumentMode.tsx |
| 2 | 新規会話ボタンで長文書モードのテキストもクリア | e931e5a | src/components/TitleBar.tsx |

## What Was Built

### Task 1: DocumentMode 自動スクロール

`DocumentMode.tsx` に以下を追加:

- `scrollEndRef = useRef<HTMLDivElement>(null)` を宣言
- `paragraphs.length` を依存配列とする `useEffect` を追加し、段落が増えたときのみ `scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' })` を実行
- 段落リスト末尾（`</div>` 閉じタグ直前）に `<div ref={scrollEndRef} />` を配置

`paragraphs` 配列オブジェクトではなく `.length` を依存配列にしたことで、`updateParagraph`（編集）では発火せず、`appendParagraph`（追加）時のみスクロールする。

### Task 2: TitleBar 新規会話クリア拡張

`TitleBar.tsx` に以下を追加:

- `useDocumentStore` をインポートし、`clearDocument` を取得
- `useConversionStore` の destructure に `setInput`, `setResult`, `setEditedResult` を追加
- 新しい会話ボタンの `onClick` を拡張し、`await newConversation()` 後に `clearDocument()`, `setInput('')`, `setResult(null)`, `setEditedResult(null)` を呼ぶ

Rust 側の会話コンテキストリセットとフロントエンドのステートクリアが同期する。

## Deviations from Plan

None - プラン通りに実行。

## Known Stubs

None.

## Self-Check: PASSED

- `src/components/DocumentMode.tsx` — 存在確認済み
- `src/components/TitleBar.tsx` — 存在確認済み
- commit `9adc3e8` — 確認済み
- commit `e931e5a` — 確認済み
- TypeScript コンパイルエラーなし (`npx tsc --noEmit` 警告のみ、エラーなし)
