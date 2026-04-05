---
plan: "02-01"
phase: "02"
status: "complete"
self_check: "PASSED"
commits:
  - "27eddf8: feat(02-01): global shortcut + FTS5 trigram migration + npm deps"
  - "1e99df4: feat(02-01): history search, pin, delete, limit commands"
  - "b7df56b: feat(02-01): provider management, custom styles CRUD, all commands registered"
key-files:
  created:
    - src-tauri/src/db/custom_styles.rs
    - src-tauri/src/commands/styles.rs
  modified:
    - src-tauri/Cargo.toml
    - src-tauri/capabilities/default.json
    - src-tauri/src/lib.rs
    - src-tauri/src/db/mod.rs
    - src-tauri/src/db/migrations.rs
    - src-tauri/src/db/conversions.rs
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/commands/history.rs
    - src-tauri/src/commands/providers.rs
    - src-tauri/src/state.rs
    - src-tauri/src/keychain.rs
    - package.json
---

## Summary

Phase 2 の Rust バックエンド基盤をすべて構築した。

### 実施内容

**Task 1: 依存関係 + グローバルショートカット + FTS5 trigram マイグレーション**
- `tauri-plugin-global-shortcut` を Cargo.toml に追加（desktop-only target）
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@tauri-apps/plugin-global-shortcut` を npm インストール
- `capabilities/default.json` にグローバルショートカット権限を追加
- `lib.rs` の `run()` にグローバルショートカットプラグイン登録と Cmd/Ctrl+Shift+R ハンドラを追加
- `MIGRATION_002` で FTS5 trigram 仮想テーブルとトリガーを作成

**Task 2: 履歴検索・ピン・削除・件数制限**
- `db/conversions.rs` に `search_history`（FTS5 + LIKE フォールバック）、`pin_conversion`、`delete_conversion`、`enforce_history_limit` を追加
- `commands/history.rs` に `search_history`、`pin_history`、`delete_history`、`set_history_limit`、`get_history_limit` コマンドを追加
- `get_history` に `pinned DESC, created_at DESC` ソートを追加

**Task 3: プロバイダー管理 + カスタムスタイル CRUD + 全コマンド登録**
- `db/custom_styles.rs` を新規作成（get/insert/update/delete）
- `commands/styles.rs` を新規作成（list_styles/create_style/update_style/delete_style）
- `commands/providers.rs` に `get_provider_config`、`upsert_provider`（Keychain連携）、`delete_provider`、`ping_provider`、`set_active_provider` を追加
- `state.rs` に `app_data_dir: PathBuf` フィールドを追加
- `keychain.rs` に `delete_api_key` を追加
- `lib.rs` の `invoke_handler` に全14新コマンドを登録

### 逸脱

- `search_history` の Rust lifetime エラー（`stmt` の借用）を `let rows` ローカル変数への束縛で修正した。プラン記載コードそのままではコンパイルエラーになるため Rule 3 で自動修正。

### 検証

- `cargo build --manifest-path src-tauri/Cargo.toml` 成功（warning 1件：未使用import、機能影響なし）
