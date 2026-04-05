---
phase: 02-daily-driver-polish
verified: 2026-04-05T11:21:08Z
status: human_needed
score: 5/5
human_verification:
  - test: "グローバルホットキー (Cmd+Shift+R) でアプリを表示/非表示できること"
    expected: "アプリが非表示の状態から Cmd+Shift+R を押すと前面に表示され、再度押すと非表示になる"
    why_human: "グローバルショートカットの動作確認はアプリを実際に起動して別アプリにフォーカスを移した状態でないと検証できない"
  - test: "ドラッグ&ドロップによるバッファアイテムの並び替え"
    expected: "バッファパネル内でアイテムをドラッグして順序を変更できる"
    why_human: "ドラッグ操作はブラウザ/Tauri ウィンドウ上でのマウス操作が必要で自動検証不可"
  - test: "ProviderSettings でプロバイダー接続テスト (ping)"
    expected: "「接続テスト」ボタンを押すと Rust 側の ping_provider が呼ばれ、200/401 なら成功表示される"
    why_human: "実際の HTTP 通信 (Ollama localhost:11434 等) が必要"
  - test: "GitHub Copilot Device Flow 認証フロー (実験的)"
    expected: "「GitHub で認証」ボタン → device_code 表示 → github.com で認証 → Keychain 保存の一連フローが動作する"
    why_human: "外部 OAuth フローとブラウザ操作が必要。ネットワーク依存かつ GitHub アカウント必須"
  - test: "カスタムスタイルを使った変換が正しく動作すること"
    expected: "StyleManager で作成したカスタムスタイルが StyleSelector に表示され、そのスタイルを選択して変換できる"
    why_human: "スタイル作成→表示→変換の E2E フローは実際の AI プロバイダー呼び出しを伴い自動検証不可"
---

# Phase 2: Daily Driver Polish 検証レポート

**フェーズゴール:** ユーザーがホットキーからアプリを呼び出せ、過去の変換を即座に検索でき、複数段落の作業を前の結果を失わずに行え、プロバイダー設定を管理できること
**検証日時:** 2026-04-05T11:21:08Z
**ステータス:** human_needed
**再検証:** No — 初回検証

## ゴール達成度

### 観測可能な真実 (Success Criteria)

| # | 真実 | ステータス | 根拠 |
|---|------|-----------|------|
| 1 | ユーザーが手動切り替えなしに Cmd/Ctrl+Shift+R でアプリを表示/非表示できる | ✓ VERIFIED | `lib.rs` に `tauri_plugin_global_shortcut` が `.plugin()` で登録され、setup フックで `app.global_shortcut().register(shortcut)` が呼ばれる。macOS は SUPER+SHIFT+R、それ以外は CTRL+SHIFT+R で条件分岐済み |
| 2 | ユーザーがキーワードで履歴を検索でき、スタイルでフィルタリングでき、頻繁に使う変換をピンできる | ✓ VERIFIED | `HistoryDrawer.tsx` に 300ms デバウンス検索バー・8スタイルフィルターチップ・ピントグルボタンが完全実装。`search_history`(FTS5 trigram + LIKE フォールバック)・`pin_conversion`・`delete_conversion` が Rust 側で DB 実装済み |
| 3 | ユーザーが複数の変換テキストをドラフトバッファにストックし、並び替え・削除・一括コピーができる | ✓ VERIFIED | `DraftBuffer.tsx` が `@dnd-kit/core` + `@dnd-kit/sortable` で実装済み。`bufferStore.ts` の `addItem/removeItem/reorder/copyAll` が `DraftBuffer` と `ResultDisplay` に完全接続。`App.tsx` にマウント済み |
| 4 | ユーザーがカスタム変換スタイルを作成・編集・削除でき、ビルトインプリセットと同様に使える | ✓ VERIFIED | `StyleManager.tsx` がインライン編集・追加・削除(確認UI付き)を実装。`StyleSelector.tsx` が `BUILT_IN_STYLES + customStyles` をマージして表示。Rust 側 `custom_styles.rs` + `commands/styles.rs` でDB CRUD 完備 |
| 5 | ユーザーが対応プロバイダー(Anthropic/OpenAI互換/Copilot)を設定・接続テスト・切り替えでき、Ollama/LM Studio がオフラインで動作する | ✓ VERIFIED | `ProviderSettings.tsx` でプロバイダー CRUD・ping テスト・アクティブ切り替えが実装。Rust の `openai` adapter は `base_url` を設定可能で Ollama(`http://localhost:11434/v1`)・LM Studio 両対応。`CopilotAdapter` は Device Flow OAuth で実装済み(実験的ラベル+ToS警告付き) |

**スコア:** 5/5 truths verified

### 要求成果物

| 成果物 | 想定 | ステータス | 詳細 |
|--------|------|-----------|------|
| `src-tauri/src/db/custom_styles.rs` | カスタムスタイル DB CRUD | ✓ VERIFIED | get/insert/update/delete 実装済み |
| `src-tauri/src/commands/styles.rs` | Tauri スタイルコマンド | ✓ VERIFIED | list/create/update/delete コマンド + invoke_handler 登録済み |
| `src-tauri/src/providers/copilot.rs` | CopilotAdapter + Device Flow | ✓ VERIFIED | `impl ProviderAdapter for CopilotAdapter`・`start_device_flow()`・`poll_for_token()` 実装済み |
| `src/store/bufferStore.ts` | Zustand ドラフトバッファ store | ✓ VERIFIED | `addItem/removeItem/reorder/copyAll/clear` 実装済み、`@dnd-kit/sortable` の `arrayMove` で並び替え |
| `src/hooks/useCustomStyles.ts` | カスタムスタイル TanStack Query hooks | ✓ VERIFIED | `useCustomStyles/useCreateStyle/useUpdateStyle/useDeleteStyle` 実装済み |
| `src/components/HistoryDrawer.tsx` | 検索・フィルター・ピン・削除拡張 | ✓ VERIFIED | 全機能実装済み (300ms デバウンス、スタイルフィルターチップ、ピン、削除) |
| `src/components/DraftBuffer.tsx` | dnd-kit ソータブルバッファパネル | ✓ VERIFIED | SortableContext + useSortable + MouseSensor 実装済み、App.tsx にマウント済み |
| `src/components/settings/SettingsDialog.tsx` | 3タブ設定シェル | ✓ VERIFIED | プロバイダー/スタイル/全般タブ全て実コンポーネントで埋まっている (スタブなし) |
| `src/components/settings/ProviderSettings.tsx` | プロバイダー CRUD + ping UI | ✓ VERIFIED | 追加・編集・削除・接続テスト・アクティブ切り替え・Copilot Device Flow UI 実装済み |
| `src/components/settings/StyleManager.tsx` | カスタムスタイル CRUD UI | ✓ VERIFIED | インライン編集・追加・削除(確認UI)実装済み |
| `src/components/settings/HistorySettings.tsx` | 履歴件数制限設定 UI | ✓ VERIFIED | `getHistoryLimit()`/`setHistoryLimit()` と接続、デフォルト1000・min10・max10000 |
| `src/components/StyleSelector.tsx` | カスタムスタイル統合 | ✓ VERIFIED | `useCustomStyles` + allStyles マージでビルトインとカスタムを同一表示 |
| `src/components/TitleBar.tsx` | ギアアイコン設定ボタン | ✓ VERIFIED | `<SettingsDialog />` import + 配置済み |
| `src/lib/tauri.ts` | 14個の新規 invoke ラッパー | ✓ VERIFIED | searchHistory/pinHistory/deleteHistory/setHistoryLimit/getHistoryLimit/listCustomStyles/createCustomStyle/updateCustomStyle/deleteCustomStyle/getProviderConfig/upsertProvider/deleteProvider/pingProvider/setActiveProvider + DeviceCodeResponse型 + startCopilotAuth/pollCopilotAuth |

### キーリンク検証

| From | To | Via | ステータス | 詳細 |
|------|-----|-----|-----------|------|
| `HistoryDrawer.tsx` | `search_history` (Rust) | `searchHistory()` in `useHistory` hook | ✓ WIRED | `useHistory({ search: debouncedSearch })` → `searchHistory()` in `src/lib/tauri.ts` → `invoke('search_history', ...)` |
| `HistoryDrawer.tsx` | `pin_history` (Rust) | `pinHistory()` in `lib/tauri.ts` | ✓ WIRED | `handlePin` → `pinHistory(id, pinned)` → `invoke('pin_history', ...)` |
| `HistoryDrawer.tsx` | `delete_history` (Rust) | `deleteHistory()` in `lib/tauri.ts` | ✓ WIRED | `handleDelete` → `deleteHistory(id)` → `invoke('delete_history', ...)` |
| `DraftBuffer.tsx` | `bufferStore` | `useBufferStore()` | ✓ WIRED | `const { items, removeItem, reorder, copyAll } = useBufferStore()` |
| `ResultDisplay.tsx` | `bufferStore.addItem` | `useBufferStore((s) => s.addItem)` | ✓ WIRED | バッファに追加ボタン → `addToBuffer(result.converted, selectedStyleId)` |
| `DraftBuffer.tsx` | クリップボード | `writeText()` from `@tauri-apps/plugin-clipboard-manager` | ✓ WIRED | `handleCopyAll` → `writeText(copyAll())` |
| `StyleSelector.tsx` | `custom_styles` DB | `useCustomStyles()` → `listCustomStyles()` → Rust `list_styles` | ✓ WIRED | `useQuery({ queryFn: listCustomStyles })` → `invoke('list_styles')` → `db::custom_styles::get_custom_styles()` |
| `SettingsDialog.tsx` | `StyleManager` / `HistorySettings` | Tab content | ✓ WIRED | スタブなし。Plan 05 のプレースホルダーは Plan 06 で完全置換済み |
| `TitleBar.tsx` | `SettingsDialog` | import + JSX | ✓ WIRED | `import { SettingsDialog } from './settings/SettingsDialog'` + `<SettingsDialog />` |
| `ProviderSettings.tsx` | `ping_provider` (Rust) | `usePingProvider()` mutation | ✓ WIRED | `pingMutation.mutate({ baseUrl, apiKey })` → `invoke('ping_provider', ...)` |
| `lib.rs` | `global_shortcut` plugin | `.plugin(tauri_plugin_global_shortcut::Builder::new()...)` | ✓ WIRED | `.with_handler()` + setup フック内 `.register(shortcut)` で二重登録 |
| `CopilotAdapter` | `ProviderAdapter` trait | `impl ProviderAdapter for CopilotAdapter` | ✓ WIRED | `async fn complete()` + `fn name()` + `fn provider_type()` + `fn model_id()` |
| `lib.rs` | `CopilotAdapter` | `"copilot"` match arm | ✓ WIRED | `"copilot" => { Arc::new(providers::copilot::CopilotAdapter::new(key, p.model.clone())) }` |

### データフロートレース (Level 4)

| 成果物 | データ変数 | ソース | 実データを生成 | ステータス |
|--------|------------|--------|--------------|-----------|
| `HistoryDrawer.tsx` | `history` (ConversionRecord[]) | `useHistory()` → `getHistory()`/`searchHistory()` → SQLite `conversions` テーブル | DB クエリ確認済み (`SELECT ... FROM conversions ORDER BY pinned DESC, created_at DESC`) | ✓ FLOWING |
| `StyleSelector.tsx` | `customStyles` (CustomStyle[]) | `useCustomStyles()` → `listCustomStyles()` → SQLite `custom_styles` テーブル | DB クエリ確認済み (`SELECT ... FROM custom_styles ORDER BY sort_order`) | ✓ FLOWING |
| `DraftBuffer.tsx` | `items` (BufferItem[]) | `useBufferStore()` の Zustand インメモリ状態 | `ResultDisplay` の「バッファに追加」ボタンから `addItem()` で追加 | ✓ FLOWING |
| `ProviderSettings.tsx` | `providerConfig` (ProvidersFile) | `useProviderConfig()` → `getProviderConfig()` → `providers.json` ファイル | `load_providers_config()` でファイルから読み込み、DB でなくファイルベース | ✓ FLOWING |
| `HistorySettings.tsx` | `limit` (number) | `useEffect` → `getHistoryLimit()` → SQLite `settings` テーブル | `settings::get_setting(&conn, "history_limit")` で DB 読み込み | ✓ FLOWING |

### ビヘイビアースポットチェック

| 動作 | コマンド | 結果 | ステータス |
|------|---------|------|-----------|
| TypeScript コンパイル | `node_modules/.bin/tsc --noEmit` | exit code 0 | ✓ PASS |
| Rust ビルド | `cargo build --manifest-path src-tauri/Cargo.toml` | Finished dev profile (warning 1件: 未使用 import `GlobalShortcutExt`、機能影響なし) | ✓ PASS |
| FTS5 trigram マイグレーション定義 | `MIGRATION_002` に `tokenize='trigram'` が存在するか確認 | `src-tauri/src/db/migrations.rs:62` で確認 | ✓ PASS |
| グローバルショートカット登録コード | `lib.rs` に `app.global_shortcut().register(shortcut)` が存在するか | `lib.rs:184` で確認 | ✓ PASS |
| Copilot adapter が lib.rs に登録 | `"copilot"` match arm が存在するか | `lib.rs:143` で確認 | ✓ PASS |
| DraftBuffer が App.tsx にマウント | `<DraftBuffer />` が App.tsx に存在するか | `App.tsx:81` で確認 | ✓ PASS |
| SettingsDialog がスタブなし | スタイル・全般タブが実コンポーネントで埋まっているか | `SettingsDialog.tsx` の TabsContent が `<StyleManager />`・`<HistorySettings />` で確認 | ✓ PASS |

### 要件カバレッジ

| 要件 | ソースプラン | 説明 | ステータス | 根拠 |
|------|------------|------|-----------|------|
| CONV-07 | 02-06 | カスタム変換スタイルの作成・編集・削除 | ✓ SATISFIED | `StyleManager.tsx` (CRUD UI) + `commands/styles.rs` + `db/custom_styles.rs` 完備 |
| HIST-04 | 02-03 | キーワードによる履歴全文検索 | ✓ SATISFIED | `HistoryDrawer` 検索バー + FTS5 trigram + LIKE フォールバック実装 |
| HIST-05 | 02-03 | スタイルによる履歴フィルター | ✓ SATISFIED | スタイルフィルターチップ (8スタイル + すべて) 実装 |
| HIST-06 | 02-03 | 頻繁に使う変換のピン留め | ✓ SATISFIED | ピントグルボタン + `pin_conversion()` DB 関数 + `pinned DESC` ソート |
| HIST-07 | 02-03 | 個別履歴アイテムの削除 | ✓ SATISFIED | ホバー表示削除ボタン + `delete_conversion()` DB 関数 |
| HIST-08 | 02-06 | 履歴件数制限設定 (デフォルト 1000) | ✓ SATISFIED | `HistorySettings.tsx` UI + `set_history_limit`/`get_history_limit` コマンド + `enforce_history_limit()` |
| BUFF-01 | 02-04 | ドラフトバッファに変換テキストをストック | ✓ SATISFIED | `bufferStore.addItem()` + ResultDisplay の「バッファに追加」ボタン |
| BUFF-02 | 02-04 | バッファアイテムの並び替え | ✓ SATISFIED | `@dnd-kit/sortable` + `bufferStore.reorder()` 実装 |
| BUFF-03 | 02-04 | バッファ個別アイテムの削除 | ✓ SATISFIED | ホバー表示削除ボタン + `bufferStore.removeItem()` |
| BUFF-04 | 02-04 | バッファ全アイテムの一括コピー | ✓ SATISFIED | 全コピーボタン + `bufferStore.copyAll()` + `writeText()` |
| PROV-03 | 02-07 | GitHub Copilot (Device Flow OAuth) | ✓ SATISFIED | `CopilotAdapter` + Device Flow UI 実装 (実験的ラベル + ToS 警告付き) |
| PROV-05 | 02-05 | プロバイダー設定 (API key, base URL, model) | ✓ SATISFIED | `ProviderSettings.tsx` でフル CRUD |
| PROV-06 | 02-05 | プロバイダー接続テスト | ✓ SATISFIED | ping ボタン + `ping_provider` Rust コマンド (5秒タイムアウト) |
| PROV-08 | 02-01/05 | Ollama/LM Studio オフライン動作 | ✓ SATISFIED | `OpenAIAdapter` が `base_url` を設定可能。`lib.rs` で `"ollama"` api_key が空文字として扱われ key 不要で adapter 起動可能 |
| WINX-02 | 02-01 | グローバルホットキー Cmd/Ctrl+Shift+R | ✓ SATISFIED (要人手確認) | `tauri_plugin_global_shortcut` が `.plugin()` と setup フック両方で登録済み。実動作は人手確認が必要 |

### 発見されたアンチパターン

アンチパターンは検出されませんでした。

- `SettingsDialog.tsx` の "スタイル設定は準備中..." / "全般設定は準備中..." プレースホルダーは Plan 06 で解消確認済み
- Plan 04 SUMMARY に記録された SettingsDialog.tsx の TypeScript エラーは Plan 06 で修正済み (tsc exit 0 確認)
- Rust ビルド warning (未使用 import `GlobalShortcutExt`) は機能に影響しない

### 人手確認が必要な項目

#### 1. グローバルホットキー動作確認

**テスト:** アプリを起動し、別のアプリ(ブラウザ等)にフォーカスを移してから Cmd+Shift+R (macOS) を押す
**期待値:** Romaji Memo が前面に表示される。再度押すと非表示になる
**人手が必要な理由:** グローバルショートカットの動作はアプリを実際に起動し、別アプリにフォーカスした状態でないと確認できない

#### 2. バッファのドラッグ&ドロップ並び替え

**テスト:** 2つ以上の変換結果をバッファに追加し、アイテムをドラッグして順序を変更する
**期待値:** アイテムが新しい位置にドロップされ、順序が変わる
**人手が必要な理由:** マウスドラッグ操作は自動検証不可

#### 3. プロバイダー接続テスト

**テスト:** 設定ダイアログを開き、Ollama (`http://localhost:11434/v1`) または OpenAI を設定し「接続テスト」ボタンを押す
**期待値:** 成功メッセージ「接続成功」が表示される
**人手が必要な理由:** 実際の HTTP 通信が必要

#### 4. GitHub Copilot Device Flow 認証 (実験的)

**テスト:** 設定 > プロバイダー で Copilot adapter のプロバイダーを追加し、「GitHub で認証」ボタンを押す
**期待値:** device_code と verification_uri が表示され、github.com で認証後にトークンが Keychain に保存される
**人手が必要な理由:** 外部 OAuth フロー + GitHub アカウント + ブラウザ操作が必要

#### 5. カスタムスタイル E2E フロー

**テスト:** 設定 > スタイル でカスタムスタイルを作成し、StyleSelector でそのスタイルを選択してローマ字を変換する
**期待値:** カスタムスタイルの prompt が AI に送信され、変換結果に反映される
**人手が必要な理由:** AI プロバイダー呼び出しを伴う E2E フローは自動検証不可

### ギャップサマリー

プログラム的に検証可能なすべての項目がパスしました。

- TypeScript コンパイルエラーなし (tsc exit 0)
- Rust ビルド成功 (1件の未使用 import warning のみ)
- 全 5 つの Success Criteria が実装済みコードで確認
- 15/15 要件がカバーされている
- スタブ・プレースホルダーなし (Plan 05 のスタブは Plan 06 で解消済み)
- キーリンクはすべてソースコード上で接続確認済み
- データフローはすべて実際の DB クエリまたは Zustand store から流れている

残る確認事項は UI 動作・ネットワーク通信・外部 OAuth を伴うため人手検証が必要です。

---

_検証日時: 2026-04-05T11:21:08Z_
_検証者: Claude (gsd-verifier)_
