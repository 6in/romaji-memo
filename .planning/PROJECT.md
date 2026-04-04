# Romaji Memo

## What This Is

ローマ字入力をAIで日本語・英語・各種スタイルに変換するデスクトップアプリ。常に最前面に表示されるフローティングツールとして動作し、チャット・ドキュメント執筆・コードコメントなど幅広い場面で使う。チームに配布予定。Tauri 2 + React + TypeScript で構築する。

## Core Value

ローマ字をタイプするだけで、スペースなし連続入力でも文脈からAIが正しく日本語・英語に変換し、ワンクリックでコピーできること。

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] プロジェクトセットアップ（Tauri 2 + React + TypeScript + Tailwind CSS + Zustand）
- [ ] AnthropicAdapter実装（独自API）
- [ ] OpenAIAdapter実装（OpenAI / Ollama / OpenRouter / LM Studio 共通）
- [ ] CopilotAdapter実装（Device Flow OAuth）
- [ ] 基本変換UI（ローマ字入力→スタイル選択→変換→コピー）
- [ ] スペースなし連続入力対応（文節境界AI推定）
- [ ] タイポ・打ち間違い補正
- [ ] 変換意図（intent）表示
- [ ] 組み込みスタイル8種（標準/丁寧/大阪弁/おかま/武士/ギャル/ビジネス/AIプロンプト）
- [ ] カスタムスタイル追加・編集・削除
- [ ] SQLite変換履歴の永続保存
- [ ] 履歴の再利用（クリックで入力欄に再セット）
- [ ] 履歴検索・スタイル絞り込み
- [ ] ピン留め機能
- [ ] Always on Topトグル
- [ ] グローバルホットキー（Cmd/Ctrl+Shift+R）
- [ ] ウィンドウサイズ・位置の記憶
- [ ] ミニモード（入力欄のみの最小化ビュー）
- [ ] 下書きバッファ（複数件ストック・順序変更・個別削除・まとめてコピー）
- [ ] クリップボード監視モード（コピーテキスト自動取り込み）
- [ ] 設定画面（プロバイダー管理）
- [ ] 長文ドキュメントモード（段落単位変換・蓄積・エクスポート）
- [ ] APIキーはOS Keychainに保存（設定ファイル・localStorageに保存しない）
- [ ] ダーク/ライト両テーマ対応（ダークグリーンテーマがデフォルト）

### Out of Scope

- スクリーンショットキャプチャ + OCR — ユーザー判断で不要
- モバイルアプリ — デスクトップファースト
- リアルタイムチャット機能 — コア機能と無関係
- 動画投稿 — 過剰なストレージ/帯域コスト

## Context

- 設計書: `docs/pre/romaji-memo-design.md` に詳細な要件定義・アーキテクチャ設計あり
- テクニカルスタック: Tauri 2（Rust backend）+ Vite + React + TypeScript + Tailwind CSS + Zustand
- DB: SQLite（rusqlite, FTS5全文検索対応）
- AIプロバイダー: Anthropic独自API / OpenAI互換（Ollama/OpenRouter/LM Studio）/ GitHub Copilot SDK
- 既存UIデザイン: ダークグリーンテーマのArtifactデザインあり（ライトモードも追加）
- APIキーセキュリティ: OS Keychain経由のみ（keyring crate）
- チーム配布予定のため、macOS 12+ / Windows 10+ の両対応が必要

## Constraints

- **Tech Stack**: Tauri 2 + React + TypeScript — 設計書で決定済み
- **Security**: APIキーはOS Keychainのみ — 設定ファイル/localStorageに保存禁止
- **Performance**: 起動3秒以内、メモリ200MB以下
- **Cross-platform**: macOS 12+ / Windows 10+ 両対応
- **Offline**: Ollama / LM Studio 選択時は完全オフライン動作

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Tauri 2（v1ではない） | 最新APIとプラグインエコシステム | — Pending |
| ProviderAdapter trait パターン | Anthropic独自API / OpenAI互換 / Copilot SDKを統一インターフェースで扱う | — Pending |
| Zustand for state | 軽量・シンプル・Reactとの相性が良い | — Pending |
| SQLite + FTS5 | 履歴の全文検索が必要、組み込みDBで十分 | — Pending |
| OS Keychain for API keys | セキュリティ要件（チーム配布のため） | — Pending |
| ダーク/ライト両テーマ | チーム配布で好み分かれる。ダークグリーンがデフォルト | — Pending |
| OCR除外 | ユーザー判断で不要、Phase 3スコープを縮小 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-05 after initialization*
