---
created: 2026-04-06T00:00:00.000Z
title: AI プロンプトモードで日本語が返る問題を修正
area: ui
files:
  - src-tauri/src/providers/prompts.rs:17
---

## Problem

スタイル選択で「AIプロンプト」を選んで変換すると、英語ではなく日本語が返ってくる。

## Root Cause

`prompts.rs` の `build_system_prompt()` において、`"prompt"` スタイルの指示は:
```
"効果的な英語AIプロンプトに変換。意図を正確に英語で。"
```

しかし、システムプロンプト全体が日本語で書かれており (「あなたはローマ字入力を変換するエンジンです」等)、
スタイル指示が弱いため AI が日本語出力のデフォルト動作を継続してしまう。

## Solution

`"prompt"` スタイルの指示を強化し、出力言語を英語に固定することを明示する。

```rust
"prompt" => "Output MUST be in English only. Convert to an effective English AI prompt. Express the intent accurately in English. Do NOT output Japanese.",
```

または、スタイルが `"prompt"` の場合は `build_system_prompt` 内で
出力形式の `"converted"` フィールドの説明自体を英語に上書きするなど、
プロンプト全体レベルで英語出力を強制する対応も有効。
