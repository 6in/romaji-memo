# Phase 1: Core Conversion Loop - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Working floating utility — romaji in, AI output (with spinner → full-result display), one-click copy, persistent history, two providers (Anthropic + OpenAI-compatible), OS Keychain for API keys, always-on-top toggle.

Requirements: CONV-01, CONV-02, CONV-03, CONV-04, CONV-05, CONV-06, HIST-01, HIST-02, HIST-03, PROV-01, PROV-02, PROV-04, PROV-07, WINX-01, WINX-03, WINX-04, PLAT-01, PLAT-02, PLAT-03, PLAT-04

Custom styles (CONV-07), history search/pin (HIST-04〜08), global hotkey (WINX-02), settings UI (PROV-05/06), and Copilot adapter (PROV-03) are Phase 2.
</domain>

<decisions>
## Implementation Decisions

### 変換トリガー
- **D-01:** 変換は「変換ボタンクリック」または「Cmd/Ctrl+Enter」で実行。
- **D-02:** Enter キーは改行のみ（特殊処理なし）。テキストエリアはマルチライン対応。
- **D-03:** Shift+Enter も改行として扱う（変換との区別不要なので特別扱いしない）。

### ストリーミング表示
- **D-04:** 変換中はスピナーを表示。完了後に変換結果を一括表示（ストリーミングなし）。
- **D-05:** Tauri Channel API はPhase 1 では使わない。`invoke()` で完了を待つシンプルな実装。ストリーミングはPhase 2以降で必要になれば追加検討。

### Phase 1 プロバイダー設定（開発者向け）
- **D-06:** Phase 1 はチーム内開発者向け。フル設定UIはPhase 2。
- **D-07:** API キーはシェルコマンドでOS Keychainに直接設定する。
  - macOS: `security add-generic-password -s "romaji-memo" -a "anthropic" -w "<API_KEY>"`
  - Windows: `cmdkey /add:romaji-memo-anthropic /user:api_key /pass:<API_KEY>`
- **D-08:** 設定ファイル（`providers.json` または `tauri.conf.json` 内）にはプロバイダー種別・モデル・base_url のみ記述。API キーは `<encrypted>` プレースホルダー。keyring クレートで読み取り時にKeychain参照。
- **D-09:** API キーが未設定の場合、変換実行時にエラートースト「API key not configured. Run setup command in README.」を表示する。
- **D-10:** README にセットアップ手順（Keychain登録コマンド）を記載する。

### 履歴パネル配置
- **D-11:** ボトムドロワー形式。「履歴」ボタンで展開/折りたたみ。
- **D-12:** ドロワーを展開するとウィンドウが縦に伸びる（ウィンドウリサイズ）。ドロワーがコンバーターをオーバーレイしない。
- **D-13:** 履歴アイテムをクリックすると入力欄に再セット（HIST-03）。
- **D-14:** 履歴一覧はスクロール可能なリスト。各アイテムに「スタイル名」「変換結果プレビュー」「タイムスタンプ」を表示。

### UI全般
- **D-15:** ダークグリーンテーマをデフォルト。WINX-04によりライト/ダーク切り替えトグルをPhase 1で実装。
- **D-16:** ウィンドウは `decorations: false, transparent: true`（design doc §5.3 より）。カスタムタイトルバー実装が必要（ドラッグ移動対応）。
- **D-17:** ウィンドウ位置・サイズはSQLite `settings` テーブルに保存し、起動時に復元（WINX-03）。
- **D-18:** Always on Top トグルはUIのどこかに常設（WINX-01）。ピン📌アイコン等でステータスを視覚化。

### Claude's Discretion
- スタイルセレクターのUI形式（タブ / ドロップダウン / チップ選択）
- 履歴アイテムの削除UIの配置（スワイプ / ゴミ箱ボタン）
- エラー表示のスタイル（toast位置・アニメーション）
- スピナーのデザイン
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 要件・仕様
- `docs/pre/romaji-memo-design.md` — フル設計書。変換プロンプト設計(§3)、DBスキーマ(§4)、アーキテクチャ構成(§5)、Cargo依存(§6)、実装優先順位(§7)を定義。
- `.planning/REQUIREMENTS.md` — Phase 1 スコープ要件 (CONV-01〜06, HIST-01〜03, PROV-01/02/04/07, WINX-01/03/04, PLAT-01〜04) の受け入れ基準。

### スタック・バージョン
- `CLAUDE.md` §Technology Stack — 全ライブラリの確定バージョン（Tauri 2.10.3, rusqlite 0.39, keyring 3.6.3, reqwest 0.13, Tailwind v4, shadcn/ui Tailwind v4 branch）。MUST NOT use versions from design doc §6 (outdated).

### ウィンドウ設定
- `docs/pre/romaji-memo-design.md` §5.3 — tauri.conf.json ウィンドウ設定（420×600、decorations: false、transparent: true）。

### DBスキーマ
- `docs/pre/romaji-memo-design.md` §4 — SQLite スキーマ（conversions, custom_styles, settings テーブル + FTS5 仮想テーブル + インデックス）。Phase 1 では custom_styles テーブルも初期マイグレーションに含める（Phase 2 で必要）。

### プロンプト設計
- `docs/pre/romaji-memo-design.md` §3 — システムプロンプトテンプレートとスタイル定義8種。出力はJSON（`converted`, `intent`, `typo`）。
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- なし（グリーンフィールドプロジェクト。`create-tauri-app` でスキャフォールド後に実装開始）

### Established Patterns
- ProviderAdapter trait パターンは `docs/pre/romaji-memo-design.md` §2.2 で定義済み。Rust 実装のベースとして使う。
- DB アクセスは Rust 側で完結。フロントは `invoke()` 経由のみ（設計書 §8 の方針）。
- エラーハンドリングは `Result` 型で統一、フロント側でトースト表示。

### Integration Points
- Tauri コマンド: `convert`, `get_history`, `toggle_always_on_top`, `list_providers`, `save_provider`（設計書 §5.2）。Phase 1 スコープは `convert`, `get_history`, `toggle_always_on_top`, `list_providers`。
- keyring クレートでOS Keychain 読み取り → AnthropicAdapter / OpenAIAdapter に渡す。
- rusqlite: `tokio::task::spawn_blocking` でラップして async Tauri コマンドから呼ぶ（CLAUDE.md パターン）。
</code_context>

<specifics>
## Specific Ideas

- 「Enter キーは改行のみ」— キーボード操作でうっかり変換しないように。Cmd/Ctrl+Enter を使う。
- 「手動Keychain設定」— Phase 1 は開発者配布前提。README に `security` / `cmdkey` コマンド例を記載。
- design doc §6 の Cargo バージョンは古い（reqwest 0.12, rusqlite 0.32）。CLAUDE.md のバージョンテーブルが正。
</specifics>

<deferred>
## Deferred Ideas

- Tauri Channel API によるストリーミング表示 — Phase 1 では invoke+スピナー で十分。必要なら Phase 2 で追加。
- フル設定画面（プロバイダー管理・APIキーUI）— Phase 2 (PROV-05/06)
- GitHub Copilot アダプター — Phase 2 (PROV-03)
- グローバルホットキー (Cmd/Ctrl+Shift+R) — Phase 2 (WINX-02)
- 履歴検索・ピン留め — Phase 2 (HIST-04〜06)
- カスタムスタイル — Phase 2 (CONV-07)

### Reviewed Todos (not folded)
None — no pending todos matched this phase.
</deferred>

---

*Phase: 01-core-conversion-loop*
*Context gathered: 2026-04-05*
