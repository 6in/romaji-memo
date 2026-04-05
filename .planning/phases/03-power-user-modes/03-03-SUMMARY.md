---
phase: 03-power-user-modes
plan: "03"
subsystem: integration-verification
tags: [verification, mini-mode, clipboard-watch, document-mode]
dependency_graph:
  requires: [03-01, 03-02]
  provides: [phase-03-verified]
  affects: []
status: approved
---

## Summary

Phase 3 全 3 機能の統合検証をユーザーが実施。初期テストで 4 件の不具合が発見され、すべて修正済み。

## Tasks

### Task 1: ビルド確認 ✓
- `npx tsc --noEmit` → エラー 0
- `cargo check` → 警告 1 件 (未使用 import)、エラーなし

### Task 2: 手動検証 (approved with fixes)

ユーザーが以下を確認。不具合が発見され修正した上で承認。

## Bugs Fixed During Verification

| # | 症状 | 原因 | 修正 |
|---|------|------|------|
| 1 | ミニモードで幅が広がり復帰サイズが狂う | `outerSize()` が PhysicalSize を返すのに `LogicalSize` に直接渡していた | `scaleFactor()` で割って論理ピクセルに変換 |
| 2 | クリップボード監視が動かない | `onTextUpdate()` を `startListening()` より先に呼んでいた | 順序を逆に (`startListening` → `onTextUpdate`) |
| 3 | 長文書モードのアイコンが非表示 | Wave 2 ブランチが main にマージされていなかった | `git merge` で解消 |
| 4 | 起動時ウィンドウが大きすぎる | 物理ピクセル値を論理ピクセルとして DB に保存、デフォルト高さ過大 | App.tsx で `scaleFactor()` 除算、デフォルト高さ 600→500px |

## Self-Check

- [x] ミニモード切替が正常に動作する (縮小/復帰)
- [x] クリップボード監視が動作する (外部コピー取り込み/自己コピー無視)
- [x] 長文書モードで段落変換・蓄積・削除・エクスポートが動作する
- [x] 3 機能が通常モードと競合しない
- [x] ユーザー承認済み

## Key Files

- `src/lib/tauri.ts` — enterMiniMode: scaleFactor 変換修正
- `src/hooks/useClipboardWatch.ts` — startListening/onTextUpdate 順序修正
- `src/App.tsx` — ウィンドウ状態の論理ピクセル保存
- `src-tauri/tauri.conf.json` — デフォルト高さ 500px
