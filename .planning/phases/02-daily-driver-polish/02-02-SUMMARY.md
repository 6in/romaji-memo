---
phase: 02-daily-driver-polish
plan: "02"
subsystem: frontend-foundation
tags: [typescript, zustand, tanstack-query, tauri-invoke, dnd-kit]
dependency_graph:
  requires: []
  provides:
    - src/lib/tauri.ts (全新規 invoke ラッパー 14 個)
    - src/store/bufferStore.ts (ドラフトバッファ Zustand store)
    - src/hooks/useCustomStyles.ts (カスタムスタイル TanStack Query hooks)
  affects:
    - src/hooks/useHistory.ts
    - src/hooks/useProviders.ts
    - src/store/settingsStore.ts
    - src/components/HistoryDrawer.tsx
tech_stack:
  added:
    - "@dnd-kit/sortable ^1.x (arrayMove for bufferStore reorder)"
    - "@dnd-kit/core (peer dependency)"
  patterns:
    - "Zustand create() pattern for bufferStore"
    - "TanStack Query useMutation with queryClient.invalidateQueries for cache busting"
    - "Tauri invoke<T>() typed wrappers"
key_files:
  created:
    - src/store/bufferStore.ts
    - src/hooks/useCustomStyles.ts
  modified:
    - src/lib/tauri.ts
    - src/store/settingsStore.ts
    - src/hooks/useHistory.ts
    - src/hooks/useProviders.ts
    - src/components/HistoryDrawer.tsx
decisions:
  - "useHistory をオブジェクト引数に変更し HistoryDrawer.tsx も同 PR 内で更新 — Plan 03 での変更量を削減"
  - "@dnd-kit/sortable を bufferStore reorder の依存として選択 — Plan で指定済み"
metrics:
  duration: "~10 minutes"
  completed_date: "2026-04-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 5
---

# Phase 2 Plan 02: Frontend Foundation Summary

Phase 2 のフロントエンド基盤として、全新規 Tauri invoke ラッパー、bufferStore、拡張 hooks を TypeScript コンパイル可能な状態で構築した。

## What Was Built

### Task 1: Tauri invoke ラッパー + 新規型定義
`src/lib/tauri.ts` に以下を追加:

**新規型 (3個):**
- `CustomStyle` — カスタムスタイルの型
- `ProviderConfig` — プロバイダー設定の型
- `ProvidersFile` — プロバイダーリストの型

**新規 invoke ラッパー (14個):**
- 履歴: `searchHistory`, `pinHistory`, `deleteHistory`, `setHistoryLimit`, `getHistoryLimit`
- スタイル: `listCustomStyles`, `createCustomStyle`, `updateCustomStyle`, `deleteCustomStyle`
- プロバイダー: `getProviderConfig`, `upsertProvider`, `deleteProvider`, `pingProvider`, `setActiveProvider`

### Task 2: bufferStore + hooks 拡張

**新規ファイル:**
- `src/store/bufferStore.ts` — Zustand store。`@dnd-kit/sortable` の `arrayMove` を使った `reorder`、`items/addItem/removeItem/copyAll/clear` を実装
- `src/hooks/useCustomStyles.ts` — `useCustomStyles/useCreateStyle/useUpdateStyle/useDeleteStyle`

**既存ファイル拡張:**
- `src/store/settingsStore.ts` — `historyLimit: number` と `setHistoryLimit` を追加
- `src/hooks/useHistory.ts` — オブジェクト引数 `{enabled, search, styleFilter, limit, offset}` に変更。FTS5 全文検索対応
- `src/hooks/useProviders.ts` — `useProviderConfig/useUpsertProvider/useDeleteProvider/usePingProvider/useSetActiveProvider` を追加
- `src/components/HistoryDrawer.tsx` — `useHistory(isDrawerOpen)` → `useHistory({ enabled: isDrawerOpen })` に更新

## Commits

| Commit | Message |
|--------|---------|
| `1bed75b` | feat(02-02): add Phase 2 Tauri invoke wrappers and type definitions |
| `42bb467` | feat(02-02): add bufferStore, extend hooks for Phase 2 UI layer |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @dnd-kit/sortable が未インストール**
- **Found during:** Task 2 実装前の依存チェック
- **Issue:** `bufferStore.ts` が `arrayMove` を `@dnd-kit/sortable` からインポートするが、`package.json` に依存なし
- **Fix:** `npm install @dnd-kit/sortable @dnd-kit/core` を実行
- **Files modified:** `package.json`, `package-lock.json`
- **Commit:** `1bed75b` (Task 1 コミットに含める)

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information-disclosure | src/lib/tauri.ts | ProviderConfig.apiKey フィールドがフロントエンド型として存在。実値は Rust 側で `"<encrypted>"` として返すべきだが、Plan 05 で password masking 実装まで UI 側の表示制御が未対応 |

## Known Stubs

なし — このプランはすべて型定義・ラッパー・hooks のみ。UI コンポーネントは Wave 2 プランで実装。

## Self-Check: PASSED

| Check | Result |
|-------|--------|
| src/lib/tauri.ts exists | FOUND |
| src/store/bufferStore.ts exists | FOUND |
| src/store/settingsStore.ts exists | FOUND |
| src/hooks/useHistory.ts exists | FOUND |
| src/hooks/useProviders.ts exists | FOUND |
| src/hooks/useCustomStyles.ts exists | FOUND |
| src/components/HistoryDrawer.tsx exists | FOUND |
| Commit 1bed75b exists | FOUND |
| Commit 42bb467 exists | FOUND |
| `npx tsc --noEmit` passes | PASS |
