---
phase: 02-daily-driver-polish
plan: "03"
subsystem: history-ui
tags: [history, search, filter, pin, delete, shadcn, ui]
dependency_graph:
  requires: ["02-01", "02-02"]
  provides: ["HIST-04", "HIST-05", "HIST-06", "HIST-07"]
  affects: ["src/components/HistoryDrawer.tsx"]
tech_stack:
  added: []
  patterns:
    - "300ms debounce via useEffect+setTimeout for search input"
    - "group/group-hover Tailwind pattern for conditional button visibility"
    - "queryClient.invalidateQueries for optimistic post-mutation refresh"
key_files:
  created:
    - src/components/ui/input.tsx
    - src/components/ui/badge.tsx
  modified:
    - src/components/HistoryDrawer.tsx
decisions:
  - "Badge onClick handled via useRender.ComponentProps pass-through (base-ui/react)"
  - "Delete button uses opacity-0/group-hover:opacity-100 instead of conditional render for smooth UX"
  - "Filter chip toggle: clicking active style resets to null (not required by spec, improves UX)"
metrics:
  duration: "87s"
  completed_date: "2026-04-05"
  tasks_completed: 2
  files_changed: 3
---

# Phase 02 Plan 03: HistoryDrawer 検索・フィルター・ピン・削除拡張 Summary

**One-liner:** shadcn Input/Badge を追加し、HistoryDrawer を 300ms デバウンス検索・スタイルフィルターチップ・ピントグル・ホバー削除に完全対応させた。

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | shadcn Input/Badge コンポーネント追加 | 0b98731 | src/components/ui/input.tsx, src/components/ui/badge.tsx |
| 2 | HistoryDrawer 拡張 — 検索・フィルター・ピン・削除 | 6b2d972 | src/components/HistoryDrawer.tsx |

## What Was Built

- **shadcn Input** (`src/components/ui/input.tsx`): base-ui/react + Tailwind v4 対応の Input コンポーネント
- **shadcn Badge** (`src/components/ui/badge.tsx`): default/secondary/destructive/outline/ghost/link バリアント付き Badge
- **HistoryDrawer 拡張** (`src/components/HistoryDrawer.tsx`):
  - 検索バー (HIST-04): `<Input>` + `<Search>` アイコン + 300ms デバウンス
  - スタイルフィルターチップ (HIST-05): 「すべて」 + BUILT_IN_STYLES 8スタイル、横スクロール対応
  - ピンアイコン (HIST-06): `<Pin>` アイコン、ピン済みは `fill-primary`、`queryClient.invalidateQueries` による楽観的更新
  - 削除ボタン (HIST-07): `group-hover:opacity-100` でホバー時のみ表示、確認なし即削除
  - 空状態: 「履歴がありません / 変換すると、ここに表示されます。」「見つかりませんでした / 別のキーワードで試してください。」

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

### Minor Adjustments

1. **フィルターチップの再クリックで null リセット**: プランには「onClick で setStyleFilter(style.id)」とあったが、アクティブチップを再クリックすると null にリセットする UX に変更。フィルター解除が直感的になる。

## Threat Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-02-08 | `searchQuery.trim()` をデバウンス後に適用。Rust 側のパラメータバインディングと合わせて二重防御 |
| T-02-09 | 300ms デバウンス実装済み。ベストエフォート対応 |

## Self-Check: PASSED

- [x] `src/components/ui/input.tsx` exists
- [x] `src/components/ui/badge.tsx` exists
- [x] `src/components/HistoryDrawer.tsx` modified (141 insertions)
- [x] Commit 0b98731 exists (chore: add shadcn Input and Badge)
- [x] Commit 6b2d972 exists (feat: extend HistoryDrawer)
- [x] TypeScript `npx tsc --noEmit` passes (0 errors)
