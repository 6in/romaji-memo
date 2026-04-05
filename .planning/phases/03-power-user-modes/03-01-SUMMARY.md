---
phase: 03-power-user-modes
plan: "01"
subsystem: window-ux
tags: [mini-mode, clipboard-watch, plugins, tauri-plugins]
dependency_graph:
  requires: []
  provides: [mini-mode-toggle, clipboard-watch-hook, dialog-plugin, fs-plugin, clipboard-plugin]
  affects: [TitleBar, App, conversionStore, ResultDisplay]
tech_stack:
  added:
    - tauri-plugin-dialog@2 (Rust crate + @tauri-apps/plugin-dialog npm)
    - tauri-plugin-fs@2 (Rust crate + @tauri-apps/plugin-fs npm)
    - tauri-plugin-clipboard@2 CrossCopy (Rust crate + tauri-plugin-clipboard-api@2.1.11 npm)
  patterns:
    - Zustand store extended with isMiniMode/savedSize/isClipboardWatching/clipboardIgnoreUntil
    - CrossCopy startListening + onTextUpdate for clipboard monitoring
    - enterMiniMode saves outerSize before setSize; exitMiniMode restores from savedSize
    - clipboardIgnoreUntil timestamp prevents self-copy capture (T-03-03)
    - 300ms debounce on clipboard callback prevents DoS (T-03-01)
key_files:
  created:
    - src/hooks/useClipboardWatch.ts
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/src/lib.rs
    - src-tauri/capabilities/default.json
    - package.json
    - src/store/conversionStore.ts
    - src/lib/tauri.ts
    - src/components/TitleBar.tsx
    - src/components/ResultDisplay.tsx
    - src/App.tsx
decisions:
  - "CrossCopy tauri-plugin-clipboard (not official clipboard-manager) used for watch mode — official plugin is read/write only"
  - "setMinSize(null) called before enterMiniMode to bypass tauri.conf.json minHeight=400 constraint"
  - "clipboardIgnoreUntil timestamp approach (1000ms) chosen over text comparison for self-copy prevention"
metrics:
  duration_seconds: 201
  completed_date: "2026-04-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 8
---

# Phase 03 Plan 01: Mini-Mode + Clipboard Watch Summary

ミニモード切替 (WINX-05) とクリップボード監視 (WINX-06) を実装し、Plan 02 の長文書エクスポートが依存する dialog/fs プラグインも登録済み状態にした。CrossCopy `tauri-plugin-clipboard` を使って startListening/onTextUpdate でクリップボード変更を300msデバウンスで捕捉し、自分自身のコピーを `clipboardIgnoreUntil` タイムスタンプで防止する構成。

## What Was Built

### Task 1: Rust/JS プラグイン追加 + capabilities 更新

3つの新プラグインをRust/JS両側に登録し、capabilities権限を追加した。

- `tauri-plugin-dialog = "2"` / `@tauri-apps/plugin-dialog` — Plan 02のエクスポート用
- `tauri-plugin-fs = "2"` / `@tauri-apps/plugin-fs` — Plan 02のファイル書き込み用
- `tauri-plugin-clipboard = "2"` (CrossCopy) / `tauri-plugin-clipboard-api@2.1.11` — WINX-06クリップボード監視
- `capabilities/default.json` に window set-size / dialog / fs / clipboard 権限9項目追加
- `cargo check` 通過確認

**Commit:** `821792a`

### Task 2: ミニモード + クリップボード監視のUI実装

- `conversionStore.ts`: `isMiniMode`, `savedSize`, `isClipboardWatching`, `clipboardIgnoreUntil` ステートを追加
- `src/lib/tauri.ts`: `enterMiniMode()` / `exitMiniMode()` ヘルパー関数を追加（setMinSize(null) + setSize パターン）
- `src/hooks/useClipboardWatch.ts`: CrossCopy `startListening` + `onTextUpdate` ラッパー hook を新規作成（300msデバウンス、T-03-01/T-03-03対応）
- `TitleBar.tsx`: ミニモードボタン (Minimize2/Maximize2) とクリップボード監視ボタン (ClipboardCheck/ClipboardPaste) を追加
- `ResultDisplay.tsx`: コピー時に `setClipboardIgnoreUntil(Date.now() + 1000)` を呼んで自分自身のコピーを監視から除外
- `App.tsx`: `useClipboardWatch` hookを接続、ミニモード中のウィンドウ状態保存をスキップ、DraftBuffer/HistoryDrawerをミニモード時に非表示化

**Commit:** `91e10cb`

## Decisions Made

1. **CrossCopy を使用**: 公式 `tauri-plugin-clipboard-manager` はread/writeのみで監視非対応。CrossCopy `tauri-plugin-clipboard` を追加登録することで両プラグインを共存させた。
2. **setMinSize(null) パターン**: tauri.conf.json の `minHeight: 400` 制約がミニモードのリサイズをブロックするため、enterMiniMode 時に setMinSize(null) で制約を解除し、exitMiniMode 時に LogicalSize(320, 400) で復元する。
3. **clipboardIgnoreUntil タイムスタンプ**: 自分自身のコピーを防ぐためにテキスト比較ではなく時刻ベースの1000msウィンドウを採用。より単純で確実。

## Deviations from Plan

なし — プランどおりに実装した。

## Known Stubs

なし。

## Threat Flags

なし — 新規ネットワークエンドポイント・認証パス・ファイルアクセスパターンの追加はない。クリップボード監視の脅威軽減 (T-03-01, T-03-02, T-03-03) はすべて実装済み。

## Self-Check: PASSED

- `src/hooks/useClipboardWatch.ts` — FOUND
- `src/store/conversionStore.ts` isMiniMode — FOUND
- `src/lib/tauri.ts` enterMiniMode — FOUND
- `src/components/TitleBar.tsx` Minimize2 — FOUND
- `src/App.tsx` useClipboardWatch — FOUND
- Commit `821792a` — FOUND
- Commit `91e10cb` — FOUND
- `npx tsc --noEmit` — PASSED (エラーなし)
- `cargo check` — PASSED (警告1件: unused import、既存コードの問題)
