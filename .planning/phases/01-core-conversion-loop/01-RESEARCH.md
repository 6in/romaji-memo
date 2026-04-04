# Phase 1: Core Conversion Loop - Research

**Researched:** 2026-04-05
**Domain:** Tauri 2 + React + TypeScript desktop app — greenfield scaffold, AI provider integration, SQLite history, OS Keychain, floating window
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** 変換は「変換ボタンクリック」または「Cmd/Ctrl+Enter」で実行。
- **D-02:** Enter キーは改行のみ（特殊処理なし）。テキストエリアはマルチライン対応。
- **D-03:** Shift+Enter も改行として扱う（変換との区別不要なので特別扱いしない）。
- **D-04:** 変換中はスピナーを表示。完了後に変換結果を一括表示（ストリーミングなし）。
- **D-05:** Tauri Channel API はPhase 1 では使わない。`invoke()` で完了を待つシンプルな実装。ストリーミングはPhase 2以降で必要になれば追加検討。
- **D-06:** Phase 1 はチーム内開発者向け。フル設定UIはPhase 2。
- **D-07:** API キーはシェルコマンドでOS Keychainに直接設定する。macOS: `security add-generic-password -s "romaji-memo" -a "anthropic" -w "<API_KEY>"`。Windows: `cmdkey /add:romaji-memo-anthropic /user:api_key /pass:<API_KEY>`
- **D-08:** 設定ファイル（`providers.json` または `tauri.conf.json` 内）にはプロバイダー種別・モデル・base_url のみ記述。API キーは `<encrypted>` プレースホルダー。keyring クレートで読み取り時にKeychain参照。
- **D-09:** API キーが未設定の場合、変換実行時にエラートースト「API key not configured. Run setup command in README.」を表示する。
- **D-10:** README にセットアップ手順（Keychain登録コマンド）を記載する。
- **D-11:** ボトムドロワー形式。「履歴」ボタンで展開/折りたたみ。
- **D-12:** ドロワーを展開するとウィンドウが縦に伸びる（ウィンドウリサイズ）。ドロワーがコンバーターをオーバーレイしない。
- **D-13:** 履歴アイテムをクリックすると入力欄に再セット（HIST-03）。
- **D-14:** 履歴一覧はスクロール可能なリスト。各アイテムに「スタイル名」「変換結果プレビュー」「タイムスタンプ」を表示。
- **D-15:** ダークグリーンテーマをデフォルト。WINX-04によりライト/ダーク切り替えトグルをPhase 1で実装。
- **D-16:** ウィンドウは `decorations: false, transparent: true`（design doc §5.3 より）。カスタムタイトルバー実装が必要（ドラッグ移動対応）。
- **D-17:** ウィンドウ位置・サイズはSQLite `settings` テーブルに保存し、起動時に復元（WINX-03）。
- **D-18:** Always on Top トグルはUIのどこかに常設（WINX-01）。ピン📌アイコン等でステータスを視覚化。

### Claude's Discretion

- スタイルセレクターのUI形式（タブ / ドロップダウン / チップ選択）
- 履歴アイテムの削除UIの配置（スワイプ / ゴミ箱ボタン）
- エラー表示のスタイル（toast位置・アニメーション）
- スピナーのデザイン

### Deferred Ideas (OUT OF SCOPE)

- Tauri Channel API によるストリーミング表示 — Phase 1 では invoke+スピナー で十分。必要なら Phase 2 で追加。
- フル設定画面（プロバイダー管理・APIキーUI）— Phase 2 (PROV-05/06)
- GitHub Copilot アダプター — Phase 2 (PROV-03)
- グローバルホットキー (Cmd/Ctrl+Shift+R) — Phase 2 (WINX-02)
- 履歴検索・ピン留め — Phase 2 (HIST-04〜06)
- カスタムスタイル — Phase 2 (CONV-07)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONV-01 | User can input romaji text and receive AI-converted Japanese/English output | ProviderAdapter trait + AnthropicAdapter/OpenAIAdapter patterns documented; `convert` Tauri command flow defined |
| CONV-02 | User can select conversion style from 8 built-in presets | Style definitions in JSON per design §3.2; StyleSelector UI at Claude's discretion |
| CONV-03 | Space-free continuous romaji input correctly segmented | System prompt boundary-inference design in design §3.1; identified as core risk needing early validation spike |
| CONV-04 | User can see AI's interpretation (intent display) | JSON response field `intent`; render alongside converted output |
| CONV-05 | User can see typo/mistype corrections | JSON response field `typo`; render conditionally |
| CONV-06 | User can copy conversion result to clipboard with one click | `tauri-plugin-clipboard-manager 2.3.2`; `write_text()` Tauri command |
| HIST-01 | Conversion history persistently stored in SQLite | `conversions` table schema defined; rusqlite 0.39 bundled; FTS5 virtual table + 3 triggers required |
| HIST-02 | User can browse conversion history in a scrollable list | `get_history` command with limit/offset pagination; History bottom drawer (D-11) |
| HIST-03 | User can click a history item to reload it into input field | History item click → conversionStore.setInput(); D-13 |
| PROV-01 | User can use Anthropic API (Claude) as conversion provider | AnthropicAdapter with reqwest 0.13 + rustls-tls; API key from keyring crate |
| PROV-02 | User can use OpenAI-compatible APIs as conversion provider | OpenAIAdapter with configurable base_url; covers OpenAI/Ollama/LM Studio |
| PROV-04 | User can switch between providers from the UI | `list_providers` command; settingsStore.activeProvider; provider dropdown/selector in UI |
| PROV-07 | API keys stored exclusively in OS Keychain | keyring 3.6.3; Mutex-serialized access; shell command setup (D-07); `<encrypted>` placeholder in config |
| WINX-01 | User can toggle Always on Top mode | `toggle_always_on_top` Tauri command; pin icon in custom title bar (D-18) |
| WINX-03 | Window position and size remembered across restarts | `settings` SQLite table; save on move/resize (debounced); restore on startup (D-17) |
| WINX-04 | User can switch between dark and light themes | Tailwind v4 dark mode via `data-theme` attribute; dark-green default (D-15) |
| PLAT-01 | App launches in under 3 seconds | Avoid blocking Keychain reads at startup; lazy provider init if needed |
| PLAT-02 | App uses less than 200MB memory | Tauri 2 vs Electron: Tauri ~50MB baseline vs Electron 500MB+; paginate history (50 records max per IPC call) |
| PLAT-03 | App works on macOS 12+ | keyring 3.6.3 targets macOS 12+; rustls-tls avoids OpenSSL; test packaged .app |
| PLAT-04 | App works on Windows 10+ | keyring 3.6.3 targets Windows 10+; rustls-tls avoids OpenSSL; cmdkey setup command; test packaged .exe |
</phase_requirements>

---

## Summary

Phase 1 is a greenfield Tauri 2 desktop app build — from `create-tauri-app` scaffold to a working floating utility. The entire Phase 1 scope is well-researched and well-defined across five prior research documents. No novel research is required here; this document consolidates and phase-scopes those findings for the planner.

The fundamental architecture is a two-layer Tauri 2 app: a React 19 / TypeScript WebView frontend that communicates exclusively through typed `invoke()` wrappers, and a Rust backend that owns all durable state (SQLite via `AppState { db: Mutex<Connection>, providers: RwLock<HashMap> }`) and all external I/O (AI HTTP via reqwest, OS Keychain via keyring). Prompt assembly happens in Rust; the frontend only passes semantic parameters (`style_id`, `input`, `provider_id`).

Phase 1 contains five load-bearing technical risks, all of which must be addressed during this phase rather than deferred: (1) the `decorations: false + transparent: true` window combination has confirmed regressions in packaged Tauri 2 builds; (2) FTS5 virtual tables require all three triggers (INSERT/UPDATE/DELETE) created in the initial migration or the index silently corrupts; (3) OS Keychain access must be serialized behind a `Mutex<()>` from startup; (4) window position persistence must avoid `tauri-plugin-window-state` which hangs on macOS with undecorated windows; (5) the space-free romaji boundary inference depends entirely on prompt design and needs a validation spike before the conversion UI is built.

**Primary recommendation:** Scaffold first, then build infrastructure bottom-up (DB → Keychain → ProviderAdapter → convert command) before touching any UI. Test the packaged binary on both macOS and Windows before calling Phase 1 done.

---

## Project Constraints (from CLAUDE.md)

| Directive | Requirement |
|-----------|-------------|
| Tech stack | Tauri 2 + React + TypeScript — decided, do not deviate |
| API key storage | OS Keychain only — never config files, localStorage, or SQLite |
| Performance | Launch < 3 seconds, memory < 200MB |
| Cross-platform | macOS 12+ and Windows 10+ both required |
| Offline | Ollama/LM Studio must work fully offline (OpenAIAdapter with localhost base_url) |
| reqwest TLS | Use `rustls-tls` only — never `native-tls` (causes Windows build failures) |
| DB access pattern | All rusqlite calls must use `tokio::task::spawn_blocking` — never block async commands |
| IPC pattern | All `invoke()` calls go through typed wrappers in `src/lib/tauri.ts` |
| Prompt location | System prompts assembled in Rust, not TypeScript |

---

## Standard Stack

### Core Technologies

| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| Tauri | 2.10.3 | Desktop shell, IPC bridge, window management | Latest stable; global shortcuts, clipboard, transparent windows, rich plugin ecosystem; dramatically smaller than Electron |
| Rust | stable (1.93.1 on dev machine; min 1.77.2) | Backend runtime; all AI HTTP, SQLite, Keychain I/O | Tauri's native layer; keeps all secrets off the frontend |
| React | 19.x | UI framework | Official `create-tauri-app` React template targets React 19 |
| TypeScript | 5.x | Type safety | Typed `invoke()` wrappers and IPC autocompletion |
| Vite | 6.x | Frontend bundler / dev server | Official Tauri 2 recommendation; Tailwind v4 Vite plugin integration |

[VERIFIED: cargo search tauri → 2.10.3, rustc --version → 1.93.1]

### Frontend Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | 5.0.12 | Global UI state (conversion, history, settings, window flags) | All UI state that crosses component boundaries; keep ephemeral local state in `useState` |
| TanStack Query | 5.96.2 | Async data fetching/caching for `invoke()` calls | Wrap `get_history`, `list_providers`, `get_settings` calls; gives loading/error states + cache invalidation |
| Tailwind CSS | 4.2.2 | Utility-first styling | Installed via `@tailwindcss/vite` plugin — no config file; `@import "tailwindcss"` in CSS; dark/light via `@theme` |
| shadcn/ui | latest (Tailwind v4 branch) | Accessible component primitives | Buttons, drawers, dropdowns, toasts; copy-paste model; Radix UI underneath |
| Lucide React | latest | Icon set | Ships with shadcn/ui; tree-shakable SVG; use for pin icon (D-18), copy icon, spinner |

[VERIFIED: npm view zustand → 5.0.12, npm view @tanstack/react-query → 5.96.2, npm view tailwindcss → 4.2.2]

### Rust Crates

| Crate | Version | Purpose | Why |
|-------|---------|---------|-----|
| tauri | 2.10.3 | Core framework | Features: `clipboard-manager` in `Cargo.toml` |
| tauri-plugin-clipboard-manager | 2.3.2 | Read/write system clipboard | Official Tauri 2 plugin; `write_text()` for one-click copy |
| tokio | 1.x | Async runtime | Tauri 2 embeds tokio; declare explicitly with `features = ["full"]` for own async tasks |
| reqwest | 0.13.x | HTTP client for AI provider calls | Use `features = ["json", "rustls-tls"]` (no `stream` in Phase 1 — no streaming) |
| serde | 1.x | Serialize/deserialize JSON | Standard; `features = ["derive"]` |
| serde_json | 1.x | JSON parsing | AI provider responses; SQLite settings stored as JSON |
| rusqlite | 0.39.0 | SQLite database | `features = ["bundled"]` — embeds SQLite, eliminates system version mismatches; FTS5 included |
| keyring | 3.6.3 | OS Keychain (macOS Keychain, Windows Credential Manager) | Latest stable; NEVER store API keys elsewhere; macOS 12+ / Windows 10+ targets match |
| async-trait | 0.1.x | Async methods on traits | Required for `ProviderAdapter` trait with `async fn complete()` |

[VERIFIED: cargo search rusqlite → 0.39.0, cargo search keyring → 3.6.3 (v4.0.0-rc.3 in RC — stick with 3.6.3)]

**Note on Phase 1 vs full stack:** `tauri-plugin-global-shortcut` is NOT included in Phase 1 (global hotkey is Phase 2/D-18 deferred). The `stream` feature on reqwest is NOT required for Phase 1 (D-04/D-05 — no streaming). Do not add these to Phase 1 plans.

### Installation

```bash
# 1. Scaffold greenfield project
npm create tauri-app@latest romaji-editor -- --template react-ts
cd romaji-editor

# 2. Tailwind v4 via Vite plugin
npm install tailwindcss @tailwindcss/vite

# 3. shadcn/ui (Tailwind v4 mode)
npx shadcn@latest init

# 4. State management + async data
npm install zustand @tanstack/react-query

# 5. Icons
npm install lucide-react

# 6. Dev dependencies
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint prettier
```

**Rust crates (src-tauri/Cargo.toml):**
```toml
[dependencies]
tauri          = { version = "2", features = [] }
tokio          = { version = "1", features = ["full"] }
reqwest        = { version = "0.13", features = ["json", "rustls-tls"] }
serde          = { version = "1", features = ["derive"] }
serde_json     = "1"
rusqlite       = { version = "0.39", features = ["bundled"] }
keyring        = "3.6"
async-trait    = "0.1"

[dependencies.tauri-plugin-clipboard-manager]
version = "2"
```

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
})
```

**src/index.css:**
```css
@import "tailwindcss";

@theme {
  --color-primary: oklch(40% 0.15 160);   /* dark green default */
  --color-background: oklch(15% 0.05 160);
  /* light theme variants in data-theme="light" */
}
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rusqlite (bundled) | sqlx with SQLite | sqlx is async but adds compile-time query checking complexity; rusqlite sync + spawn_blocking is simpler and battle-tested |
| keyring 3.6.3 | tauri-plugin-keyring (community) | Community plugin wraps same crate; using crate directly gives more control; no plugin version lag |
| Tailwind v4 | Tailwind v3 | v4 is cleaner for greenfield — no config file, native Vite plugin, CSS variables theming |
| rustls-tls | native-tls | native-tls on Windows requires OpenSSL; rustls-tls is pure Rust, builds cleanly on both platforms |

---

## Architecture Patterns

### Recommended Project Structure

```
romaji-editor/
├── src-tauri/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs              # App bootstrap, plugin registration, AppState init
│       ├── state.rs             # AppState: Mutex<Connection>, RwLock<providers>, Mutex<keychain_guard>
│       ├── commands/
│       │   ├── mod.rs           # Re-exports all commands for registration
│       │   ├── convert.rs       # convert() — routes to provider, saves history
│       │   ├── history.rs       # get_history() — paginated, style-filtered
│       │   ├── providers.rs     # list_providers()
│       │   └── window.rs        # toggle_always_on_top(), save_window_state(), get_window_state()
│       ├── providers/
│       │   ├── mod.rs           # ProviderAdapter trait, CompletionRequest/Response, ProviderError
│       │   ├── anthropic.rs     # AnthropicAdapter
│       │   └── openai.rs        # OpenAIAdapter (OpenAI/Ollama/LM Studio)
│       ├── db/
│       │   ├── mod.rs           # connection setup, migration runner, PRAGMA setup
│       │   ├── migrations.rs    # SQL migration strings
│       │   ├── conversions.rs   # insert, paginated query for conversions + FTS5 triggers
│       │   └── settings.rs      # get/set for settings table (window state, theme, active provider)
│       └── keychain.rs          # get_api_key(), set_api_key() behind Mutex<()>
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                  # Theme provider (data-theme attr), QueryClientProvider
│   ├── components/
│   │   ├── TitleBar.tsx         # Custom drag handle (data-tauri-drag-region); always-on-top pin; window controls
│   │   ├── Converter.tsx        # Romaji textarea, StyleSelector, Convert button, result display, copy button
│   │   ├── StyleSelector.tsx    # 8 built-in style chips/tabs/dropdown (Claude's discretion)
│   │   ├── ResultDisplay.tsx    # Converted text + intent annotation + typo correction display
│   │   └── HistoryDrawer.tsx    # Bottom drawer; scrollable list; each item shows style/preview/timestamp
│   ├── hooks/
│   │   ├── useConvert.ts        # Calls invoke('convert'); manages loading/error; updates conversionStore
│   │   ├── useHistory.ts        # Calls invoke('get_history') with pagination; manages historyStore
│   │   └── useProviders.ts      # Calls invoke('list_providers'); manages settingsStore.providers
│   ├── store/
│   │   ├── conversionStore.ts   # input, result, loading, error, selectedStyleId, activeProviderId
│   │   ├── historyStore.ts      # historyItems, isDrawerOpen, currentPage
│   │   └── settingsStore.ts     # activeProvider, theme ('dark'|'light'), alwaysOnTop
│   └── lib/
│       ├── tauri.ts             # ALL invoke() wrappers — components never import @tauri-apps/api directly
│       └── styles.ts            # Built-in style definitions array (mirrors design §3.2; used for UI display only)
│
├── tauri.conf.json              # Window: 420x600, decorations:false, transparent:true, alwaysOnTop:true
├── providers.json               # Provider configs without API keys (<encrypted> placeholder)
└── package.json
```

### Pattern 1: AppState with Mutex-wrapped DB Connection

**What:** Rust `AppState` holds SQLite connection behind `tokio::sync::Mutex`, registered with Tauri's managed state system.

**When to use:** Any command needing DB access.

```rust
// src-tauri/src/state.rs
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use rusqlite::Connection;
use std::collections::HashMap;
use crate::providers::ProviderAdapter;

pub struct AppState {
    pub db: Mutex<Connection>,
    pub providers: RwLock<HashMap<String, Arc<dyn ProviderAdapter + Send + Sync>>>,
    pub keychain_lock: Mutex<()>,   // serializes all keyring access
}

// commands/convert.rs
#[tauri::command]
pub async fn convert(
    state: tauri::State<'_, AppState>,
    input: String,
    style_id: String,
    provider_id: String,
) -> Result<ConvertResult, String> {
    // Get provider without holding the lock across await
    let provider = {
        let providers = state.providers.read().await;
        providers.get(&provider_id).cloned()
            .ok_or_else(|| "Provider not found".to_string())?
    };

    let result = provider.complete(req).await.map_err(|e| e.to_string())?;

    // Save to history via spawn_blocking
    let db_result = result.clone();
    let db = state.db.clone();  // Arc clone
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        // insert into conversions table
    }).await.map_err(|e| e.to_string())??;

    Ok(result)
}
```

[CITED: docs/pre/romaji-memo-design.md §5.2, .planning/research/ARCHITECTURE.md Pattern 1]

### Pattern 2: ProviderAdapter Trait (Strategy Pattern)

**What:** All AI providers implement one async Rust trait. The command layer dispatches by `provider_id` from a `HashMap`.

```rust
// providers/mod.rs
use async_trait::async_trait;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CompletionRequest {
    pub system: String,
    pub user_message: String,
    pub model: String,
    pub max_tokens: u32,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CompletionResponse {
    pub content: String,   // raw JSON from AI: {"converted":"...","intent":"...","typo":"..."}
    pub model: String,
    pub usage: Option<TokenUsage>,
}

#[async_trait]
pub trait ProviderAdapter: Send + Sync {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse, ProviderError>;
    fn name(&self) -> &str;
    fn provider_type(&self) -> &str;   // "anthropic" | "openai"
}
```

[CITED: docs/pre/romaji-memo-design.md §2.2]

### Pattern 3: Typed invoke() Wrappers (Frontend IPC Boundary)

**What:** All `invoke()` calls live in `src/lib/tauri.ts`. Components never import from `@tauri-apps/api` directly.

```typescript
// src/lib/tauri.ts
import { invoke } from '@tauri-apps/api/core';

export interface ConvertResult {
  converted: string;
  intent: string;
  typo: string;
  historyId: number;
}

export interface ConversionRecord {
  id: number;
  input: string;
  output: string;
  styleId: string;
  intent: string | null;
  typo: string | null;
  providerId: string;
  model: string;
  createdAt: string;
}

export async function convert(
  input: string,
  styleId: string,
  providerId: string,
): Promise<ConvertResult> {
  return invoke<ConvertResult>('convert', { input, styleId, providerId });
}

export async function getHistory(
  limit: number,
  offset: number,
  styleFilter?: string,
): Promise<ConversionRecord[]> {
  return invoke<ConversionRecord[]>('get_history', { limit, offset, styleFilter });
}

export async function listProviders(): Promise<ProviderConfig[]> {
  return invoke<ProviderConfig[]>('list_providers');
}

export async function toggleAlwaysOnTop(): Promise<boolean> {
  return invoke<boolean>('toggle_always_on_top');
}

export async function saveWindowState(x: number, y: number, width: number, height: number): Promise<void> {
  return invoke('save_window_state', { x, y, width, height });
}

export async function getWindowState(): Promise<WindowState | null> {
  return invoke<WindowState | null>('get_window_state');
}
```

[CITED: .planning/research/ARCHITECTURE.md Pattern 3]

### Pattern 4: Keychain with Mutex Serialization

**What:** All keychain reads/writes go through `keychain.rs` which holds a `Mutex<()>` guard before calling into the keyring crate.

```rust
// src-tauri/src/keychain.rs
use keyring::Entry;

// Called from AppState initialization — guard lives in AppState
pub fn get_api_key(
    keychain_lock: &tokio::sync::Mutex<()>,
    provider_id: &str,
) -> Result<Option<String>, keyring::Error> {
    let _guard = keychain_lock.blocking_lock();
    let entry = Entry::new("romaji-memo", provider_id)?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e),
    }
}
```

**Critical:** Account identifier format is `provider_id` (e.g., `"anthropic"`, `"ollama-local"`). Service name is always `"romaji-memo"`. Never use empty strings for either.

[CITED: .planning/research/ARCHITECTURE.md Pattern 4, .planning/research/PITFALLS.md Pitfall 6]

### Pattern 5: SQLite DB Setup with WAL and FTS5 Triggers

**What:** DB module opens connection with WAL mode and synchronous=NORMAL, then runs migrations. Initial migration creates all three tables AND all three FTS5 sync triggers in a single transaction.

```rust
// src-tauri/src/db/mod.rs
pub fn open_db() -> Result<Connection, rusqlite::Error> {
    let path = get_app_data_dir().join("romaji-memo.db");
    let conn = Connection::open(path)?;
    conn.execute_batch("
        PRAGMA journal_mode=WAL;
        PRAGMA synchronous=NORMAL;
        PRAGMA foreign_keys=ON;
    ")?;
    run_migrations(&conn)?;
    Ok(conn)
}
```

```sql
-- migrations/001_initial.sql (embedded as string in migrations.rs)
BEGIN;

CREATE TABLE IF NOT EXISTS conversions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  input       TEXT    NOT NULL,
  output      TEXT    NOT NULL,
  style_id    TEXT    NOT NULL,
  intent      TEXT,
  typo        TEXT,
  provider_id TEXT    NOT NULL,
  model       TEXT    NOT NULL,
  pinned      INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_styles (
  id          TEXT    PRIMARY KEY,
  label       TEXT    NOT NULL,
  emoji       TEXT    NOT NULL,
  prompt      TEXT    NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS settings (
  key         TEXT    PRIMARY KEY,
  value       TEXT    NOT NULL,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversions_created ON conversions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversions_style   ON conversions(style_id);
CREATE INDEX IF NOT EXISTS idx_conversions_pinned  ON conversions(pinned DESC, created_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS conversions_fts
  USING fts5(input, output, content='conversions', content_rowid='id');

-- FTS5 sync triggers (ALL THREE required — missing DELETE trigger causes silent corruption)
CREATE TRIGGER IF NOT EXISTS conversions_ai AFTER INSERT ON conversions BEGIN
  INSERT INTO conversions_fts(rowid, input, output) VALUES (new.id, new.input, new.output);
END;

CREATE TRIGGER IF NOT EXISTS conversions_ad AFTER DELETE ON conversions BEGIN
  INSERT INTO conversions_fts(conversions_fts, rowid, input, output)
    VALUES ('delete', old.id, old.input, old.output);
END;

CREATE TRIGGER IF NOT EXISTS conversions_au AFTER UPDATE ON conversions BEGIN
  INSERT INTO conversions_fts(conversions_fts, rowid, input, output)
    VALUES ('delete', old.id, old.input, old.output);
  INSERT INTO conversions_fts(rowid, input, output) VALUES (new.id, new.input, new.output);
END;

COMMIT;
```

**Note:** `custom_styles` table is created in Phase 1 migration even though Phase 1 doesn't use it — Phase 2 needs it without a migration step.

[CITED: docs/pre/romaji-memo-design.md §4, .planning/research/PITFALLS.md Pitfall 2]

### Pattern 6: Provider Config File (providers.json)

**What:** `providers.json` is loaded at startup from the app data directory. API keys are placeholders only — actual keys fetched from OS Keychain at runtime.

```json
{
  "providers": [
    {
      "id": "anthropic",
      "name": "Anthropic",
      "adapter": "anthropic",
      "api_key": "<encrypted>",
      "model": "claude-haiku-4-5-20251001",
      "enabled": true
    },
    {
      "id": "ollama-local",
      "name": "Ollama (Local)",
      "adapter": "openai",
      "base_url": "http://localhost:11434/v1",
      "api_key": "ollama",
      "model": "gemma3:12b",
      "enabled": true
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "adapter": "openai",
      "base_url": "https://api.openai.com/v1",
      "api_key": "<encrypted>",
      "model": "gpt-4o-mini",
      "enabled": false
    }
  ],
  "default_provider": "anthropic"
}
```

**Startup flow:** Read `providers.json` → for each provider where `api_key == "<encrypted>"`: call `get_api_key(provider_id)` → if `None`, mark provider as "not configured" (D-09); if `Some(key)`, instantiate adapter with key → insert into `AppState.providers` map.

[CITED: docs/pre/romaji-memo-design.md §2.3, CONTEXT.md D-08]

### Pattern 7: Window Position Persistence (Manual — No Plugin)

**What:** Do NOT use `tauri-plugin-window-state` — it hangs on macOS when `decorations: false`. Implement manual position save/restore using the `settings` SQLite table.

```rust
// commands/window.rs
#[tauri::command]
pub async fn save_window_state(
    state: tauri::State<'_, AppState>,
    x: i32, y: i32, width: u32, height: u32,
) -> Result<(), String> {
    let json = serde_json::json!({ "x": x, "y": y, "width": width, "height": height });
    let db = state.db.clone();
    tokio::task::spawn_blocking(move || {
        let conn = db.blocking_lock();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES ('window_state', ?1)",
            rusqlite::params![json.to_string()],
        )
    }).await.map_err(|e| e.to_string())?.map_err(|e| e.to_string())?;
    Ok(())
}
```

**Frontend — debounced save on resize/move:**
```typescript
// In App.tsx or TitleBar.tsx — listen for window resize/move
import { getCurrentWindow } from '@tauri-apps/api/window';

const saveState = debounce(async () => {
  const win = getCurrentWindow();
  const pos = await win.outerPosition();
  const size = await win.outerSize();
  await saveWindowState(pos.x, pos.y, size.width, size.height);
}, 500);

useEffect(() => {
  const win = getCurrentWindow();
  const unlisten = win.onMoved(saveState);
  const unlistenResize = win.onResized(saveState);
  return () => { unlisten.then(f => f()); unlistenResize.then(f => f()); };
}, []);
```

[CITED: .planning/research/PITFALLS.md Pitfall 4 — window-state plugin hangs on macOS with decorations:false]

### Pattern 8: Custom Window Chrome (Undecorated + Transparent)

**What:** `decorations: false` + `transparent: true` requires a custom React title bar with a drag handle. The HTML `data-tauri-drag-region` attribute enables native drag-to-move.

```tsx
// components/TitleBar.tsx
export function TitleBar({ alwaysOnTop, onToggleAlwaysOnTop }: TitleBarProps) {
  return (
    <div
      data-tauri-drag-region
      className="h-8 flex items-center justify-between px-3 select-none cursor-move"
    >
      <span className="text-sm font-medium text-primary-foreground">Romaji Memo</span>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleAlwaysOnTop}
          title={alwaysOnTop ? "Always on Top: ON" : "Always on Top: OFF"}
          className="opacity-70 hover:opacity-100 transition-opacity"
        >
          <Pin className={alwaysOnTop ? "text-green-400" : "text-gray-400"} size={14} />
        </button>
        {/* close / minimize buttons if needed */}
      </div>
    </div>
  );
}
```

**tauri.conf.json window config:**
```json
{
  "windows": [{
    "title": "Romaji Memo",
    "width": 420,
    "height": 600,
    "minWidth": 320,
    "minHeight": 400,
    "resizable": true,
    "alwaysOnTop": true,
    "decorations": false,
    "transparent": true
  }]
}
```

[CITED: docs/pre/romaji-memo-design.md §5.3, .planning/research/PITFALLS.md Pitfall 4]

### Pattern 9: Conversion System Prompt Assembly (Rust-side)

**What:** The system prompt is assembled in Rust from the `style_id`. The frontend never sees the prompt text.

```rust
// providers/mod.rs or a prompts.rs module
fn build_system_prompt(style_id: &str) -> String {
    let style_prompt = match style_id {
        "standard"  => "自然な日本語に変換してください。",
        "polite"    => "丁寧語・敬語。です・ます調で統一。",
        "osaka"     => "大阪弁・関西弁。〜やん、〜ねん等を自然に使用。",
        "okama"     => "おかまっぽい口調。〜わよ、〜かしら等。",
        "bushi"     => "武士言葉・時代劇風。〜でござる等。",
        "gal"       => "ギャル語・若者言葉。マジ、てか等。",
        "business"  => "ビジネスメール敬語。〜かと存じます等。",
        "prompt"    => "効果的な英語AIプロンプトに変換。意図を正確に英語で。",
        _           => "自然な日本語に変換してください。",
    };

    format!(r#"あなたはローマ字入力を変換するエンジンです。

基本ルール：
- 入力はローマ字（ヘボン式・訓令式混在可）または英単語の混在テキストです
- スペースなしの連続ローマ字入力でも文節境界を文脈から推定して正しく変換すること（スペースは区切り記号ではなくオプション扱い）
- タイポ・打ち間違いも文脈から推測して正しく変換してください
- 大文字始まりの単語は固有名詞として英語のまま残してください
- 技術用語はカタカナ優先（saabu→サーバ等）
- 必ずJSONのみ返してください。説明・マークダウン・バッククォートは一切不要です

スタイル指示：{}

出力形式（JSONのみ）：
{{"converted":"変換結果","intent":"この入力の意図を10文字程度で","typo":"タイポ修正内容。なければ空文字"}}"#,
        style_prompt)
}
```

[CITED: docs/pre/romaji-memo-design.md §3.1, §3.2, .planning/research/ARCHITECTURE.md Anti-Pattern 5]

### Anti-Patterns to Avoid

- **Direct `invoke()` in components:** All IPC through `src/lib/tauri.ts` typed wrappers only.
- **API key in SQLite/config:** Keychain only — never `settings` table, never `providers.json` raw, never `localStorage`.
- **Blocking Mutex across `.await`:** Use `tokio::sync::Mutex`, not `std::sync::Mutex`, for guards held across async points.
- **Monolithic Zustand store:** Four separate slices (`conversionStore`, `historyStore`, `settingsStore` — no draftStore in Phase 1).
- **Prompt logic in TypeScript:** System prompts are assembled in Rust; frontend passes only `style_id`.
- **`fetch()` to AI endpoints from React:** All AI HTTP goes through Rust commands; Tauri CSP blocks frontend-side calls in packaged build.
- **`tauri-plugin-window-state`:** Hangs on macOS with `decorations: false` — implement manual position persistence in SQLite instead.
- **FTS5 table without all three triggers:** Missing DELETE trigger causes silent index corruption.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OS Keychain read/write | Custom encryption, localStorage wrapper, config file | `keyring` crate 3.6.3 | Platform-native security; handles macOS ACL, Windows Credential Manager, Linux libsecret |
| Accessible UI components (buttons, drawers, toasts) | Custom React components from scratch | shadcn/ui (Radix UI) | ARIA roles, focus management, keyboard navigation all built-in; copy-paste model means full theme control |
| SQLite async wrapper | Custom async SQLite layer | `tokio::task::spawn_blocking` + rusqlite | rusqlite is sync by design; spawn_blocking is the documented Tauri pattern |
| Icon set | Custom SVGs | Lucide React | Consistent stroke width, tree-shakable, already in shadcn/ui toolchain |
| State management for IPC data | Custom React Context + useReducer | TanStack Query 5 | Automatic loading/error/cache/invalidation for async `invoke()` calls |
| HTTP client for AI providers | Custom fetch wrapper | reqwest 0.13 | Handles TLS, connection pooling, JSON deserialization, retry; rustls-tls avoids OpenSSL on Windows |

**Key insight:** The keychain and FTS5 problems both look simple but have significant platform-specific edge cases (macOS ACL prompts, Windows Credential Manager account requirements, FTS5 trigger semantics). Using the established crates eliminates weeks of debugging.

---

## Common Pitfalls

### Pitfall 1: Transparent Window Regresses to Opaque in Packaged Build

**What goes wrong:** Window appears correct in `tauri dev` but reverts to opaque after `tauri build` — especially on macOS DMG.

**Why it happens:** Known Tauri 2 issues (#12042, #13415, #14822). `decorations: false + transparent: true` combination is inconsistently implemented across platforms and Tauri versions.

**How to avoid:**
- Build a custom drag handle in React (`data-tauri-drag-region`) — do not rely on native decorations.
- Test the packaged binary (`.app` on macOS, `.exe` on Windows) before Phase 1 sign-off. Testing only `tauri dev` is insufficient.
- Do not use `tauri-plugin-window-state` — it hangs on macOS with `decorations: false`.

**Warning signs:** Window looks correct in dev, opaque in built artifact.

### Pitfall 2: FTS5 Index Silent Corruption (Missing Triggers)

**What goes wrong:** History search returns wrong or empty results; ~10% corruption rate per SQLite forum when triggers are incomplete.

**Why it happens:** `content='conversions'` FTS5 table requires explicit INSERT/UPDATE/DELETE triggers. Missing the DELETE trigger silently diverges the index.

**How to avoid:** Create all THREE trigger types (conversions_ai, conversions_ad, conversions_au) in a single migration transaction. See Pattern 5 above for correct SQL.

**Warning signs:** Search returns no results for text that was just converted.

### Pitfall 3: OS Keychain Deadlock Under Parallel Access

**What goes wrong:** App hangs at startup when multiple providers are configured (both Anthropic and OpenAI keys being read simultaneously).

**Why it happens:** The `keyring` crate is not safe to call from multiple async tasks simultaneously on macOS.

**How to avoid:** Hold `AppState.keychain_lock: Mutex<()>` before every keyring call. Use the blocking_lock() variant since keychain reads happen in `spawn_blocking` context.

**Warning signs:** Startup hangs with multiple providers enabled.

### Pitfall 4: Prompt Design Fails for Space-Free Romaji Segmentation

**What goes wrong:** `korehadouda` → AI returns literal romaji or incorrect segmentation rather than 「これはどうだ」.

**Why it happens:** Standard LLM behavior defaults to treating input as space-delimited words. The system prompt must explicitly instruct the model to infer word boundaries from context.

**How to avoid:** Run a prompt validation spike BEFORE building the conversion UI. Test at least 10 space-free romaji inputs against both AnthropicAdapter and OpenAIAdapter. Iterate on the system prompt until segmentation is reliable. The current prompt template (design §3.1) is a starting point, not a validated solution.

**Warning signs:** `korehadouda` returns romaji or incorrectly joined characters.

### Pitfall 5: AI Returns Non-JSON or Partial JSON

**What goes wrong:** Conversion result display fails silently — no converted text shown, no error message.

**Why it happens:** LLMs occasionally return explanatory text around the JSON, markdown code fences, or truncated JSON. The current prompt explicitly forbids this but LLMs don't always comply.

**How to avoid:**
```rust
// Defensive JSON extraction — strip markdown fences if present
fn extract_json(raw: &str) -> Result<ConvertOutput, serde_json::Error> {
    let cleaned = raw
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    serde_json::from_str(cleaned)
}
```
On parse failure, propagate a typed error to the frontend (not just `String`). Show actionable toast: "Conversion failed — AI returned unexpected format."

**Warning signs:** Blank result display with no error message; serde_json deserialization panics in logs.

### Pitfall 6: Zustand State Out of Sync After Command Error

**What goes wrong:** Spinner never resolves after failed conversion; history list shows records that don't exist in DB.

**Why it happens:** Optimistic UI updates written to Zustand before `invoke()` resolves are not rolled back on error.

**How to avoid:**
- Never update `conversionStore.result` or `historyStore` until the Rust command returns `Ok`.
- Define a structured error type on the Rust side (use `thiserror` crate) — never `map_err(|e| e.to_string())` at the IPC boundary.
- Always handle `invoke()` rejections in TypeScript with `.catch()` — show toast on error.

**Warning signs:** Spinner persists after backend logs show command completed.

### Pitfall 7: Always-on-Top Fails on macOS Full-Screen Spaces

**What goes wrong:** Window disappears when user switches to a full-screen macOS application.

**Why it happens:** `setAlwaysOnTop` does not override Space-level z-ordering on macOS.

**How to avoid:** Set `activation_policy: Accessory` and call `visible_on_all_workspaces(true)` after window creation. Accept that the Dock icon is hidden — this is correct for a floating utility.

```rust
// main.rs setup closure
app.set_activation_policy(tauri::ActivationPolicy::Accessory);
let window = app.get_webview_window("main").unwrap();
window.set_visible_on_all_workspaces(true)?;
```

**Warning signs:** Window invisible after switching to full-screen Safari or terminal.

### Pitfall 8: history drawer expand doesn't resize window

**What goes wrong:** History bottom drawer expands but content overlaps the converter UI; the window height doesn't actually grow.

**Why it happens:** CSS overflow expansion inside a fixed-height WebView does not automatically resize the native window. The window must be resized programmatically via Tauri's `window.setSize()`.

**How to avoid:** When the history drawer opens/closes, call `getCurrentWindow().setSize(new LogicalSize(width, newHeight))` from TypeScript. Store both "collapsed" and "expanded" heights in the settings store (derived from window size + drawer height constant).

```typescript
const DRAWER_HEIGHT = 280; // px

async function toggleHistoryDrawer(isOpen: boolean, currentWidth: number, baseHeight: number) {
  const win = getCurrentWindow();
  const newHeight = isOpen ? baseHeight + DRAWER_HEIGHT : baseHeight;
  await win.setSize(new LogicalSize(currentWidth, newHeight));
}
```

[CITED: CONTEXT.md D-12]

---

## Code Examples

### Anthropic API Call (non-streaming)

```rust
// providers/anthropic.rs
use reqwest::Client;

pub struct AnthropicAdapter {
    client: Client,
    api_key: String,
    model: String,
}

#[async_trait]
impl ProviderAdapter for AnthropicAdapter {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse, ProviderError> {
        let body = serde_json::json!({
            "model": req.model,
            "max_tokens": req.max_tokens,
            "system": req.system,
            "messages": [{"role": "user", "content": req.user_message}]
        });

        let resp = self.client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(ProviderError::Http)?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(ProviderError::Api { status: status.as_u16(), body });
        }

        let parsed: serde_json::Value = resp.json().await.map_err(ProviderError::Http)?;
        let content = parsed["content"][0]["text"]
            .as_str()
            .ok_or_else(|| ProviderError::Parse("missing content[0].text".into()))?
            .to_string();

        Ok(CompletionResponse { content, model: req.model, usage: None })
    }
}
```

### OpenAI-Compatible API Call (covers Ollama, LM Studio, OpenAI)

```rust
// providers/openai.rs
pub struct OpenAIAdapter {
    client: Client,
    base_url: String,    // "https://api.openai.com/v1" | "http://localhost:11434/v1"
    api_key: String,     // "ollama" for Ollama (any non-empty string)
    model: String,
}

#[async_trait]
impl ProviderAdapter for OpenAIAdapter {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse, ProviderError> {
        let url = format!("{}/chat/completions", self.base_url);
        let body = serde_json::json!({
            "model": req.model,
            "max_tokens": req.max_tokens,
            "messages": [
                {"role": "system", "content": req.system},
                {"role": "user",   "content": req.user_message}
            ]
        });

        let resp = self.client
            .post(&url)
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await
            .map_err(ProviderError::Http)?;

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            return Err(ProviderError::Api { status: status.as_u16(), body });
        }

        let parsed: serde_json::Value = resp.json().await.map_err(ProviderError::Http)?;
        let content = parsed["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| ProviderError::Parse("missing choices[0].message.content".into()))?
            .to_string();

        Ok(CompletionResponse { content, model: req.model, usage: None })
    }
}
```

### useConvert Hook

```typescript
// hooks/useConvert.ts
import { useState } from 'react';
import { convert, ConvertResult } from '../lib/tauri';
import { useConversionStore } from '../store/conversionStore';
import { toast } from 'sonner'; // or shadcn toast

export function useConvert() {
  const [loading, setLoading] = useState(false);
  const setResult = useConversionStore(s => s.setResult);
  const setError = useConversionStore(s => s.setError);

  const runConvert = async (input: string, styleId: string, providerId: string) => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await convert(input, styleId, providerId);
      setResult(result);
    } catch (err) {
      const msg = typeof err === 'string' ? err : 'Conversion failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { runConvert, loading };
}
```

### Cmd/Ctrl+Enter Keyboard Handler

```tsx
// components/Converter.tsx
<textarea
  value={input}
  onChange={e => setInput(e.target.value)}
  onKeyDown={e => {
    // D-01: Cmd/Ctrl+Enter triggers conversion
    // D-02: plain Enter = newline (no special handling)
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      runConvert(input, selectedStyleId, activeProviderId);
    }
    // D-03: Shift+Enter = newline (no special handling needed — textarea default)
  }}
  placeholder="ローマ字を入力..."
  rows={4}
  className="w-full resize-none rounded-md p-3 bg-background text-foreground"
/>
```

---

## Suggested Build Order (Dependencies)

The following order respects hard technical dependencies. Each step creates the foundation the next step requires.

1. **Wave 0: Project Scaffold** — `create-tauri-app`, Tailwind v4, shadcn/ui init, Zustand, TanStack Query. Set `decorations: false, transparent: true` in `tauri.conf.json` immediately and verify window renders correctly in `tauri dev`. This catches platform issues before any code is written.

2. **Wave 1: Rust Infrastructure** — DB module (migration with all three FTS5 triggers), Keychain module (with Mutex guard), AppState struct, `providers.json` loader. No commands, no UI. Test DB open, migration runs, Keychain round-trip separately.

3. **Wave 2: ProviderAdapter + Adapters** — Trait definition, AnthropicAdapter, OpenAIAdapter. Unit-test prompt assembly. Validate space-free romaji segmentation with both adapters before moving on (CRITICAL SPIKE per STATE.md).

4. **Wave 3: Core Commands** — `convert` command (routes to provider, saves to DB), `get_history` command (paginated query), `list_providers` command. No UI yet — test via Tauri devtools or a minimal hardcoded frontend.

5. **Wave 4: Core UI** — TitleBar (custom drag handle + always-on-top pin), Converter component (textarea + Cmd/Ctrl+Enter handler + StyleSelector + Convert button + spinner + ResultDisplay), basic theme (dark-green default + light toggle), `lib/tauri.ts` wrappers, `useConvert` hook.

6. **Wave 5: History Drawer** — HistoryDrawer component (bottom drawer), `useHistory` hook, window resize on expand/collapse (D-12), history item click → reload input (D-13).

7. **Wave 6: Window Persistence + Always-on-Top** — `save_window_state` / `get_window_state` commands, restore on startup, debounced save on move/resize, `toggle_always_on_top` command, pin icon state in TitleBar.

8. **Wave 7: Integration Verification** — Test packaged binary on macOS AND Windows: transparent window, Keychain round-trip, history persistence after restart, always-on-top toggle, space-free romaji segmentation.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tauri-plugin-window-state` for position persistence | Manual SQLite settings table save/restore | Tauri 2 (plugin hangs with decorations:false) | Must implement manually; no plugin |
| reqwest 0.12 (design doc §6) | reqwest 0.13 (CLAUDE.md) | 2024-2025 | Design doc is outdated; use CLAUDE.md version |
| rusqlite 0.32 (design doc §6) | rusqlite 0.39 (CLAUDE.md, crates.io) | 2026-03-15 | Design doc is outdated; use CLAUDE.md version |
| Tailwind v3 with tailwind.config.js | Tailwind v4 via @tailwindcss/vite plugin | Feb 2025 | No config file; single CSS import; `@theme` directive |
| shadcn/ui pre-v4 | shadcn/ui Tailwind v4 branch (Feb 2025+) | Feb 2025 | Use `npx shadcn@latest init` which auto-detects v4 |

**Design doc §6 Cargo versions are outdated:** The design spec shows `reqwest = "0.12"` and `rusqlite = "0.32"`. These are superseded by the versions in CLAUDE.md (`reqwest = "0.13"`, `rusqlite = "0.39"`). Always use CLAUDE.md versions.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Space-free romaji boundary inference works reliably with the prompt template in design §3.1 | Architecture Patterns (Pattern 9) | Core differentiator fails; prompt requires iteration before UI is built |
| A2 | `keyring` 3.6.3 `blocking_lock()` pattern correctly serializes macOS Keychain access | Pattern 4 | Deadlock at startup with multiple providers |
| A3 | `visible_on_all_workspaces(true)` is available in Tauri 2.10.3 WebviewWindow API | Pitfall 7 | Always-on-top may not work across macOS full-screen Spaces |

**A1** is the highest-risk assumption. STATE.md explicitly flags this: "Space-free romaji boundary inference depends entirely on prompt design — needs rapid prototyping spike before building full conversion UI." The planner MUST include a prompt validation spike task before the Converter UI wave.

---

## Open Questions

1. **Space-free segmentation prompt reliability**
   - What we know: The system prompt template in design §3.1 explicitly addresses this; it has not been tested against a real LLM in this codebase.
   - What's unclear: Whether the prompt reliably handles edge cases (mixed romaji/English, ambiguous boundaries like `tokyoni` vs `tokiyo ni`).
   - Recommendation: First task in Wave 3 is a prompt spike — run 10-15 test inputs against both Anthropic and OpenAI adapters, iterate on the prompt until segmentation is reliable. Do not build the full UI until this is validated.

2. **Windows Keychain (Credential Manager) `cmdkey` format**
   - What we know: D-07 specifies `cmdkey /add:romaji-memo-anthropic /user:api_key /pass:<API_KEY>`. The `keyring` crate uses `(service, username)` as the credential identity.
   - What's unclear: Whether the `cmdkey` credential name format (`romaji-memo-anthropic`) matches what `keyring::Entry::new("romaji-memo", "anthropic")` produces on Windows.
   - Recommendation: Verify the exact credential storage format by writing a Rust test that calls `set_api_key("anthropic", "test")` and reads it back, then checking Windows Credential Manager to confirm the name format. Document the exact `cmdkey` command that corresponds to `Entry::new("romaji-memo", "anthropic")`.

3. **History drawer window expand on Windows**
   - What we know: D-12 specifies window height expands when drawer opens. `getCurrentWindow().setSize()` is the Tauri API.
   - What's unclear: Whether `setSize()` on Windows has minimum size constraints or animation behavior that differs from macOS.
   - Recommendation: Test drawer expand/collapse on Windows in Wave 5 integration; add a minimum height guard.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend build, npm | Yes | v23.1.0 | — |
| npm | Package management | Yes | 11.6.0 | — |
| Rust (rustc) | Tauri backend compilation | Yes | 1.93.1 | — |
| Cargo | Rust package manager | Yes | 1.93.1 | — |
| Tauri CLI (`@tauri-apps/cli`) | `tauri dev`, `tauri build` | Yes | 2.10.1 | — |
| Windows test machine | Phase 1 sign-off | Unknown | — | Flag as blocker — cannot sign off PLAT-04 without real Windows build |

[VERIFIED: command -v node, rustc --version, cargo --version, npx @tauri-apps/cli --version]

**Note on Tauri CLI version:** Installed Tauri CLI is 2.10.1; project targets Tauri 2.10.3. The CLI is a build tool — the library version in Cargo.toml controls the actual Tauri version. Both are in the 2.10.x series and are compatible. No mismatch issue.

**Missing dependency with no fallback:**
- Windows test machine: Required to validate PLAT-04 (Windows 10+), Keychain Credential Manager behavior, and transparent window rendering. If no Windows machine is available, Phase 1 cannot be signed off against its own success criteria.

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No user auth in Phase 1 |
| V3 Session Management | No | Desktop app, no session tokens |
| V4 Access Control | No | Single-user desktop app |
| V5 Input Validation | Yes | Validate `style_id` against known enum; validate `provider_id` exists in providers map; sanitize for SQLite injection via parameterized queries (rusqlite params! macro) |
| V6 Cryptography | Partial | API keys stored via OS Keychain (platform-native crypto); NEVER hand-roll crypto or store keys in SQLite/files |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key in plaintext config/localStorage | Information Disclosure | keyring crate only; `<encrypted>` placeholder in providers.json |
| SQL injection in history query | Tampering | rusqlite `params![]` macro; never string-concat SQL |
| Prompt injection via romaji input | Tampering | Input is user's own text; low risk for self-use tool; prompt structure uses explicit JSON output format to constrain AI behavior |
| SSRF via configurable base_url | Tampering | Validate `base_url` is a valid HTTP/HTTPS URL before using; reject non-HTTP schemes |
| Exposed system prompt in frontend | Information Disclosure | Prompt assembled in Rust; never sent to frontend; frontend only sees `style_id` |

---

## Sources

### Primary (HIGH confidence)

- `docs/pre/romaji-memo-design.md` — authoritative project design spec: prompt templates (§3), DB schema (§4), architecture (§5), Tauri command signatures (§5.2), window config (§5.3)
- `.planning/research/STACK.md` — verified stack with crate/package versions confirmed against crates.io and npm registry (2026-04-05)
- `.planning/research/ARCHITECTURE.md` — verified architecture patterns against Tauri 2 official docs
- `.planning/research/PITFALLS.md` — pitfalls with specific Tauri GitHub issue numbers (#12042, #13415, #14822, #9439)
- `.planning/research/FEATURES.md` — feature prioritization and dependency graph
- `CLAUDE.md` — project constraints and authoritative version table
- `01-CONTEXT.md` — locked user decisions D-01 through D-18
- [VERIFIED: npm view tailwindcss → 4.2.2, zustand → 5.0.12, @tanstack/react-query → 5.96.2]
- [VERIFIED: cargo search rusqlite → 0.39.0, keyring → 3.6.3]
- [VERIFIED: rustc --version → 1.93.1, cargo --version → 1.93.1]
- [VERIFIED: npx @tauri-apps/cli --version → 2.10.1]

### Secondary (MEDIUM confidence)

- Tauri GitHub Issues: [#12042](https://github.com/tauri-apps/tauri/issues/12042), [#13415](https://github.com/tauri-apps/tauri/issues/13415), [#14822](https://github.com/tauri-apps/tauri/issues/14822) — transparent window regressions in packaged builds
- Tauri GitHub Issues: [#9439](https://github.com/tauri-apps/tauri/issues/9439) — always-on-top + macOS full-screen
- [SQLite Forum: FTS5 trigger corruption](https://sqlite.org/forum/info/da59bf102d7a7951740bd01c4942b1119512a82bfa1b11d4f762056c8eb7fc4e)
- [Tauri 2 Calling Frontend docs](https://v2.tauri.app/develop/calling-frontend/) — Channel API pattern (noted for future Phase 2)
- [keyring crate docs.rs](https://docs.rs/keyring) — thread safety warnings and platform behavior

### Tertiary (LOW confidence — validated by assumption log)

- Space-free romaji segmentation prompt reliability: based on design spec §3.1 only; not empirically validated [A1]
- Windows Credential Manager exact keyring entry name format: [A2]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all package versions verified against npm registry and crates.io
- Architecture: HIGH — patterns verified against Tauri 2 official docs and prior research; design spec is authoritative
- Pitfalls: HIGH — critical pitfalls backed by specific Tauri GitHub issue numbers; FTS5 backed by SQLite forum
- Prompt design for space-free segmentation: LOW — unvalidated; identified as Phase 1 critical spike

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (30 days — stable ecosystem; Tauri 2.x patch versions release monthly)

**Primary risk to validate first:** Space-free romaji boundary inference (Assumption A1) — run prompt spike before building Converter UI.
