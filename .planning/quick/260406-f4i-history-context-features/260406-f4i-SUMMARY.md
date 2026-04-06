---
phase: quick
plan: 260406-f4i
subsystem: db / providers / commands / ui
tags: [history-context, stopper, prompt-injection, new-conversation]
dependency_graph:
  requires: []
  provides: [履歴コンテキスト付き変換, ストッパー機能, 新しい会話ボタン]
  affects: [conversions DB, prompts, convert command, TitleBar UI]
tech_stack:
  added: []
  patterns: [spawn_blocking for rusqlite, SQLite ALTER TABLE ADD COLUMN migration]
key_files:
  created: []
  modified:
    - src-tauri/src/db/migrations.rs
    - src-tauri/src/db/mod.rs
    - src-tauri/src/db/conversions.rs
    - src-tauri/src/providers/prompts.rs
    - src-tauri/src/commands/convert.rs
    - src-tauri/src/commands/history.rs
    - src-tauri/src/lib.rs
    - src/lib/tauri.ts
    - src/components/TitleBar.tsx
    - src-tauri/tests/prompt_spike.rs
decisions:
  - "ストッパーレコードは conversions テーブルの is_stopper=1 フラグで表現（別テーブル不要）"
  - "get_recent_context は古い順で返し、プロンプトの文脈セクションに直接使用できる形式にした"
  - "履歴セクションはプロンプト末尾（出力形式の前）に配置し、スタイル指示の後に続ける"
metrics:
  duration: "約15分"
  completed_date: "2026-04-06T02:03:46Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 10
---

# Quick Task 260406-f4i: 履歴コンテキスト + ストッパー機能 Summary

**One-liner:** SQLite is_stopperカラム追加・get_recent_context関数・build_system_promptへの履歴注入・new_conversationコマンド・TitleBar新しい会話ボタンを実装し、変換精度向上とコンテキストリセットを実現

## What Was Built

変換精度向上のため直近変換履歴をAIプロンプトに含める機能と、会話コンテキストをリセットするストッパー機能を実装した。

### Task 1: DB層（b8b41d5）
- `MIGRATION_003`: `conversions` テーブルに `is_stopper INTEGER NOT NULL DEFAULT 0` カラム追加
- `run_migrations` に `version < 3` ブロックを追加
- `insert_stopper`: ストッパーレコード（is_stopper=1）を挿入する関数
- `get_recent_context`: 最新ストッパー以降の変換履歴を最大 limit 件、50文字制限で取得（古い順）
- `get_history` / `search_history`: `is_stopper = 0` 条件追加でストッパーレコードを履歴一覧から除外

### Task 2: プロンプト層 + 変換コマンド（910a2b1）
- `build_system_prompt`: `recent_history: &[(&str, &str)]` 引数追加。履歴が空でなければ「直近の変換文脈」セクションをプロンプトに追加
- `convert` コマンド: 変換前に `get_recent_context(10)` を `spawn_blocking` で取得しプロンプトへ渡す
- テスト追加: `test_with_recent_history`, `test_empty_history_no_section`（計4テスト全通過）
- `prompt_spike.rs`: 引数変更に追従（`&[]` を渡す）

### Task 3: new_conversation + UI（e5003f3）
- `history.rs`: `new_conversation` Tauri コマンド追加（insert_stopper を spawn_blocking 経由で呼び出し）
- `lib.rs`: `generate_handler!` に `commands::history::new_conversation` を登録
- `tauri.ts`: `newConversation(): Promise<void>` 関数追加
- `TitleBar.tsx`: `MessageSquarePlus` アイコンの「新しい会話（コンテキストリセット）」ボタンを SettingsDialog の左隣に追加

## Verification

- `cargo check`: 通過（警告1件 — 既存コードの unused_import、今回変更範囲外）
- `cargo test --lib -- providers::prompts`: 4/4 通過
- `tsc --noEmit`: 通過（エラーなし）

## Deviations from Plan

**1. [Rule 1 - Bug] prompt_spike.rs の build_system_prompt 引数修正**
- **Found during:** Task 2
- **Issue:** `build_system_prompt` のシグネチャ変更に伴い、integration test の `prompt_spike.rs` がコンパイルエラー
- **Fix:** `build_system_prompt("standard")` → `build_system_prompt("standard", &[])` に修正
- **Files modified:** `src-tauri/tests/prompt_spike.rs`
- **Commit:** 910a2b1 に含む

## Commits

| Task | Hash | Message |
|------|------|---------|
| Task 1 | b8b41d5 | feat(quick-260406-f4i): DB層 ストッパーマイグレーション + get_recent_context / insert_stopper |
| Task 2 | 910a2b1 | feat(quick-260406-f4i): 履歴コンテキストをプロンプトに注入 |
| Task 3 | e5003f3 | feat(quick-260406-f4i): new_conversation コマンド + TitleBar 新しい会話ボタン |

## Known Stubs

なし — すべての機能は実際のDBとプロンプトに接続されている。

## Self-Check: PASSED

- FOUND: migrations.rs, conversions.rs, prompts.rs, convert.rs, history.rs, TitleBar.tsx, tauri.ts
- FOUND: commits b8b41d5, 910a2b1, e5003f3 (3/3)
