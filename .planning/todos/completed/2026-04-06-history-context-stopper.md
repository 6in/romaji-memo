---
created: 2026-04-06T01:05:17.403Z
title: 履歴参照にストッパー機能を追加して会話コンテキストをリセットできるようにする
area: ui
files:
  - src-tauri/src/db/history.rs
  - src-tauri/src/commands/convert.rs
  - src/components/TitleBar.tsx
---

## Problem

変換プロンプトに直近の履歴を含める機能（別Todoで追加予定）を実装した場合、
新しいトピックに切り替えたときも前の会話文脈が参照され続けてしまう。

例: 「卸売業のシステム」について話していたあとに「料理レシピ」を書き始めると、
前の文脈が誤った変換を誘発する可能性がある。

## Solution

**方針 A: ストッパーレコード（推奨）**

履歴テーブルに `is_stopper: bool` カラムを追加（または専用の sentinel レコードを挿入）。
変換時に直近履歴を取得する際、最新のストッパー以降のレコードのみを参照する。

- UI: TitleBar or 入力エリアに「新しい会話を開始」ボタン（🔄 or ✂️）を追加
- ボタン押下で stopper レコードを DB に挿入
- `get_history_for_context()` クエリは `WHERE id > (SELECT MAX(id) FROM history WHERE is_stopper = 1)` で絞り込む

**方針 B: セッション ID**

各変換に `session_id` を付与し、変換時に同一 session_id のものだけを参照。
新しい会話ボタンで `session_id` をリセット。実装はやや複雑。

→ 方針 A のストッパーレコードがシンプルで後方互換性も高いため優先。

**実装ステップ:**

1. DB マイグレーション: `history` テーブルに `is_stopper INTEGER NOT NULL DEFAULT 0` を追加
2. Rust コマンド `new_conversation()` を追加 — stopper レコードを挿入
3. `convert.rs` の履歴取得クエリをストッパー以降に絞り込む
4. フロントエンド: TitleBar に「新しい会話」ボタンを追加、`invoke("new_conversation")` を呼ぶ
