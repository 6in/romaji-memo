---
status: awaiting_human_verify
trigger: "長文モードで入力後、プレビューボタンで全文表示後に再変換しようとするとパースエラーが発生する"
created: 2026-04-06T00:00:00Z
updated: 2026-04-06T00:05:00Z
---

## Current Focus

hypothesis: 確定。プレビューの長文テキストをconvertに渡すとAIが配列JSONを返すが、extract_jsonが単一オブジェクトを期待しているためパース失敗する
test: extract_json を配列対応させる修正を適用 → cargo build 成功
expecting: 配列の場合も converted フィールドを \n\n で結合して正常に返る
next_action: ユーザーによる実機確認待ち

## Symptoms

expected: 長文モード（DocumentMode）でプレビュー表示後も再変換が正常に動作する
actual: 再変換時に "JSON parse failed: invalid type: map, expected a string" エラーが発生する
errors: |
  Parse error: JSON parse failed: invalid type: map, expected a string at line 2 column 2.
  Raw: ```json
  [
    {"converted":"ソロロロ","intent":"繰り返し音の表現","typo":""},
    {"converted":"ソロソロ","intent":"そろそろという意味","typo":""},
    {"converted":"ソロソロ始...
  (truncated)
reproduction: |
  1. 長文モード（DocumentMode）に切り替える
  2. テキストを入力して変換する
  3. プレビューボタンをクリックして全文表示する
  4. 再度変換しようとする → エラー発生
started: 今日発見。プレビュー機能追加後から発生している可能性あり

## Eliminated

(none)

## Evidence

- timestamp: 2026-04-06T00:01:00Z
  checked: DocumentMode.tsx の handleConvertPreview
  found: previewText（複数段落を \n\n 結合した長文日本語）を convertText() に直接渡している（line 120）
  implication: 通常の convert コマンドに長文テキストが渡される

- timestamp: 2026-04-06T00:02:00Z
  checked: providers/prompts.rs の build_system_prompt
  found: 出力形式として単一オブジェクト {"converted":"...","intent":"...","typo":"..."} を指示している
  implication: 短いテキストには単一オブジェクトを返すが、複数段落の長文にはAIが段落ごとに配列を返す可能性がある

- timestamp: 2026-04-06T00:03:00Z
  checked: providers/mod.rs の extract_json
  found: serde_json::from_str::<ConvertOutput>(cleaned) で単一オブジェクトとしてパースしており、配列 [...] が来ると "invalid type: map, expected a string" エラーになる
  implication: AIが配列を返すケースに対応していない

- timestamp: 2026-04-06T00:04:00Z
  checked: エラーメッセージ
  found: Raw に [{"converted":"ソロロロ",...},{"converted":"ソロソロ",...},...] という配列が確認できる
  implication: AIが複数の変換候補または段落ごとの結果を配列で返している

- timestamp: 2026-04-06T00:05:00Z
  checked: cargo build
  found: 修正後のビルドが警告のみでエラーなし
  implication: Rust構文・型は正しい

## Resolution

root_cause: |
  プレビューの「全文を口調変換」ボタン（handleConvertPreview）が、複数段落を \n\n 結合した長文テキストを通常の convert コマンドに渡す。
  convert コマンドのプロンプトは単一オブジェクト形式 {"converted":"...","intent":"...","typo":"..."} を指示しているが、
  長文（複数段落）が入力されるとAIが段落ごとに配列 [{...},{...},...] を返すことがある。
  providers/mod.rs の extract_json は serde_json::from_str::<ConvertOutput> で単一オブジェクトのみ対応しており、
  配列が来ると "invalid type: map, expected a string" エラーになる。
fix: |
  src-tauri/src/providers/mod.rs の extract_json 関数を修正。
  まず単一オブジェクトとしてのパースを試み、失敗した場合は Vec<ConvertOutput> として配列パースを試みる。
  配列の場合は全要素の converted フィールドを \n\n で結合し、最初の非空の intent/typo を使用して単一の ConvertOutput を返す。
verification: cargo build 成功（エラーなし）。実機での動作確認待ち。
files_changed:
  - src-tauri/src/providers/mod.rs
