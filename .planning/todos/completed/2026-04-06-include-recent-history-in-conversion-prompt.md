---
created: 2026-04-06T01:05:17.403Z
title: 変換精度向上のため直近履歴をプロンプトに含める
area: ui
files:
  - src-tauri/src/providers/prompts.rs
  - src-tauri/src/commands/convert.rs
---

## Problem

「このプロジェクトは卸売業を対象とした者です」のように、文脈として不自然な変換が起きることがある。
（正しくは「もの」ではなく「もの（ソフトウェア）」等、文脈次第で変わる）

ローマ字→日本語変換は同音異義語の解決が課題であり、単独の文だけでは文脈情報が不足している。
当初の構想では直近の変換履歴 10 件をプロンプトに渡すことで文脈を補う設計だったが、未実装。

## Solution

`prompts.rs` の `build_system_prompt` を拡張して、直近履歴を受け取れるようにする。

**方針:**

1. `build_system_prompt(style_id, recent_history: &[(&str, &str)])` のようにシグネチャを変更
   - `recent_history`: `(input, converted)` のタプルスライス、最大 10 件
2. 履歴が存在する場合、プロンプトに以下のようなセクションを追加:

```
直近の変換文脈（参考）：
- 「konnichiwa」→「こんにちは」
- 「kono puro」→「このプロ（ジェクト）」
...
```

3. `commands/convert.rs` で変換実行前に `get_history(limit=10)` を呼び出し、
   結果を `build_system_prompt` に渡す

4. 履歴が 0 件の場合は従来通りのプロンプトを使用（ゼロコスト）

**注意点:**
- 履歴の `input`/`output` をそのままプロンプトに入れるとトークンが増える
  → 各履歴エントリは短く要約 or 先頭 50 文字で切る
- プロバイダーごとのコンテキスト長制限に注意（特に小型ローカルモデル）
