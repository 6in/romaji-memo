---
phase: 03-power-user-modes
plan: "02"
subsystem: document-mode
tags: [document-mode, export, zustand, tauri-plugin-dialog, tauri-plugin-fs]
dependency_graph:
  requires: [03-01]
  provides: [document-mode-ui, document-store, export-document]
  affects: [App, TitleBar, conversionStore]
tech_stack:
  added: []
  patterns:
    - useDocumentStore (Zustand) で段落アキュムレーターを管理
    - useEffect + prevResultRef パターンで変換成功を検出して段落を追加
    - pendingInputRef で変換前の入力テキストを保持
    - exportDocument は tauri-plugin-dialog save + tauri-plugin-fs writeTextFile で OS ネイティブ保存ダイアログ表示
    - ミニモード中は長文書ボタンを disabled にして排他制御
key_files:
  created:
    - src/store/documentStore.ts
    - src/components/DocumentMode.tsx
  modified:
    - src/store/conversionStore.ts
    - src/lib/tauri.ts
    - src/components/TitleBar.tsx
    - src/App.tsx
decisions:
  - "prevResultRef + pendingInputRef パターン: useEffect で result 変化を監視し appendParagraph を呼ぶ。historyId 比較も可能だが ref 比較の方がシンプル"
  - "エクスポートドロップダウンは CSS group-hover で実装 — shadcn DropdownMenu は不要なオーバーヘッドを避けるため"
  - "長文書モード中は DraftBuffer と HistoryDrawer を非表示 — 段落蓄積と競合するため"
metrics:
  duration_seconds: 420
  completed_date: "2026-04-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 4
---

# Phase 03 Plan 02: 長文書モード (CONV-08) Summary

段落ごとに変換結果を蓄積し、全体を .md / .txt にエクスポートできる長文書モードを実装した。TitleBar の FileText ボタンでモード切り替え、OS ネイティブ保存ダイアログ経由でエクスポート可能。

## What Was Built

### Task 1: documentStore + exportDocument 関数

長文書モードのデータ層を構築した。

- `src/store/documentStore.ts` 新規作成: `DocumentParagraph` インターフェースと `useDocumentStore` フック
  - `appendParagraph`: `crypto.randomUUID()` で id 生成、末尾に追加
  - `removeParagraph`: filter で個別削除
  - `clearDocument`: 空配列にリセット
  - `getExportContent('md')`: `## 入力 / ## 変換` フォーマットで `---` 区切り結合
  - `getExportContent('txt')`: output のみを `\n\n` 結合
- `conversionStore.ts` に `isDocumentMode: boolean` と `setDocumentMode` を追加 (初期値 false)
- `src/lib/tauri.ts` に `exportDocument` 関数を追加 (`plugin-dialog` save + `plugin-fs` writeTextFile)

**Commit:** `6558ea6`

### Task 2: DocumentMode コンポーネント + App 統合

長文書モードの UI を構築し、アプリに接続した。

- `src/components/DocumentMode.tsx` 新規作成:
  - ヘッダー: 段落数カウンター + 全消去ボタン + エクスポートドロップダウン (.md / .txt)
  - 蓄積リスト: 各段落に変換結果テキスト + 入力折りたたみ + Trash2 削除ボタン
  - 入力エリア: StyleSelector + textarea + 変換して追加ボタン
  - `prevResultRef` + `pendingInputRef` で変換成功を検出し自動 appendParagraph
- `TitleBar.tsx`: FileText アイコンの長文書モードボタンを追加 (ミニモード中 disabled)
- `App.tsx`: `isDocumentMode` 条件分岐で `DocumentMode` / `Converter` を切り替え。長文書モード中は DraftBuffer と HistoryDrawer を非表示

**Commit:** `f90a2b2`

## Decisions Made

1. **prevResultRef + pendingInputRef パターン**: `useEffect` で `result` の参照変化を監視して `appendParagraph` を呼ぶ。`ConvertResult.historyId` を使う方法もあるが、ref 比較の方がシンプルで依存が少ない。
2. **エクスポートドロップダウンに CSS group-hover を使用**: shadcn の DropdownMenu を使うとコンポーネント追加コストがかかるため、Tailwind の `group-hover` で軽量に実装。
3. **長文書モード中に DraftBuffer / HistoryDrawer を非表示**: 段落蓄積リストと DraftBuffer は目的が重複するため、長文書モード中は隠す。

## Deviations from Plan

なし — プランどおりに実装した。

## Known Stubs

なし。

## Threat Flags

なし — 新規ネットワークエンドポイント・認証パス追加なし。
T-03-05 (exportDocument) は `save()` ダイアログ経由でユーザー選択パスのみに書き込み — Tauri capabilities スコープにより任意パスへの書き込みは防止済み (Plan 01 で登録済み)。

## Self-Check: PASSED

- `src/store/documentStore.ts` — FOUND
- `src/components/DocumentMode.tsx` — FOUND
- `conversionStore.ts` isDocumentMode — FOUND
- `src/lib/tauri.ts` exportDocument — FOUND
- `TitleBar.tsx` isDocumentMode — FOUND
- `App.tsx` DocumentMode import — FOUND
- Commit `6558ea6` — FOUND
- Commit `f90a2b2` — FOUND
- `npx tsc --noEmit` — PASSED (エラーなし)
