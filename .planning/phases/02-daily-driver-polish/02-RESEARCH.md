# Phase 2: Daily Driver Polish - Research

**Researched:** 2026-04-05
**Domain:** Tauri 2 Global Shortcut / SQLite FTS5 / React DnD / Provider Settings UI
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONV-07 | User can create, edit, and delete custom conversion styles | custom_styles テーブルは Migration 001 で実装済み。CRUD Tauri commands + settings UI で実現 |
| HIST-04 | User can search history by keyword (full-text search) | FTS5 trigram tokenizer で日本語・ローマ字部分一致検索が可能。既存の conversions_fts は標準 tokenizer — Migration 002 で trigram VT に切り替えが必要 |
| HIST-05 | User can filter history by style | get_history コマンドに style_filter 引数実装済み。フロントエンド UI のみ追加 |
| HIST-06 | User can pin frequently used conversions to the top | conversions.pinned カラム、idx_conversions_pinned インデックス実装済み。pin/unpin コマンドと UI トグル追加 |
| HIST-07 | User can delete individual history items | delete_history コマンド + UI ボタン追加 |
| HIST-08 | User can set a history count limit (default 1000) | settings テーブルに history_limit キー保存。settings UI で変更 |
| BUFF-01 | User can stock multiple converted texts in a draft buffer | フロントエンドのみ: Zustand store で配列管理 |
| BUFF-02 | User can reorder items in the draft buffer | @dnd-kit/core + @dnd-kit/sortable でドラッグ並び替え |
| BUFF-03 | User can delete individual items from the draft buffer | Zustand の filter アクション |
| BUFF-04 | User can copy all buffer items at once | tauri-plugin-clipboard-manager でジョイン文字列をコピー |
| PROV-03 | User can use GitHub Copilot as conversion provider via Device Flow OAuth | Device Flow OAuth 実装リスク高 — 内部エンドポイント使用は ToS 違反の可能性。実験的機能として実装またはデファー |
| PROV-05 | User can configure provider settings in a settings screen | providers.json 読み書き + Keychain 更新の複合 Tauri commands 追加 |
| PROV-06 | User can test provider connectivity from the settings screen | ping_provider コマンド: /models または /v1/models への軽量 GET |
| PROV-08 | User can use Ollama/LM Studio fully offline | OpenAIAdapter が既に base_url 対応済み。ネットワーク切断時の reqwest エラーハンドリング確認 |
| WINX-02 | User can show/hide the app via global hotkey (Cmd/Ctrl+Shift+R) | tauri-plugin-global-shortcut 2.3.1 を Rust 側で登録。show/hide + set_focus パターン |
</phase_requirements>

---

## Summary

Phase 2 は「毎日使える道具」への磨き上げフェーズ。Phase 1 が構築したインフラ（SQLite FTS5 テーブル・custom_styles テーブル・providers.json/Keychain 体制）を活かして、グローバルホットキー・履歴検索/ピン・ドラフトバッファ・カスタムスタイル管理・プロバイダー設定 UI を追加する。

技術的に最も複雑なのは WINX-02 (Global Shortcut + ウィンドウ表示/非表示) と HIST-04 (FTS5 部分一致検索の tokenizer 変更)。どちらも Phase 1 の基盤があるため追加工数は限定的だが、macOS での `set_focus` の既知バグ（Tauri 2.3〜2.10 系: tao 由来）に対する回避策が必要。

GitHub Copilot (PROV-03) は STATE.md の懸念通り、内部 API エンドポイントを使うため ToS リスクが高い。実験的フラグを付けた実装か v2 デファーを推奨する。残りの要件はすべて Phase 1 コードに直接積み上げられる低リスクの拡張。

**Primary recommendation:** Global Shortcut と FTS5 trigram migration から着手し、その後 UI 重視の features（ドラフトバッファ・設定画面）を進める。Copilot adapter は最後に分離した Plan で実装し、失敗しても他要件に影響しないようにする。

---

## Project Constraints (from CLAUDE.md)

- **Tech Stack**: Tauri 2 + React + TypeScript (変更不可)
- **Security**: API キーは OS Keychain のみ — settings.json や localStorage への書き込み禁止
- **Performance**: 起動 3 秒以内、メモリ 200 MB 以下
- **Cross-platform**: macOS 12+ / Windows 10+ 両対応
- **Offline**: Ollama / LM Studio 選択時は完全オフライン動作
- **Tauri Channel API** (streaming) を使用。events は禁止。
- **rusqlite** は sync → `tokio::task::spawn_blocking` 経由で呼ぶ
- **keychain_lock: Mutex<()>** を通じてシリアライズ
- **reqwest**: `rustls-tls` のみ (`native-tls` 禁止)
- **CSS**: Tailwind v4、shadcn/ui (copy-paste モデル)

---

## Standard Stack

### Core (Phase 2 追加分)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tauri-plugin-global-shortcut | 2.3.1 | グローバルホットキー登録・解除 | Tauri 公式プラグイン。Rust 側で登録することで、ウィンドウが非表示でも動作 [VERIFIED: crates.io] |
| @tauri-apps/plugin-global-shortcut | 2.3.1 | JS バインディング (capabilities のみ使用) | Rust 側登録の capability 記述に必要 [VERIFIED: npm registry] |
| @dnd-kit/core | 6.3.1 | ドラッグ&ドロップコンテキスト | React 向け最軽量 DnD ライブラリ。Tauri デスクトップでも動作確認済 [VERIFIED: npm registry] |
| @dnd-kit/sortable | 10.0.0 | ソータブルリスト preset | arrayMove + useSortable で最小実装 [VERIFIED: npm registry] |
| @dnd-kit/utilities | 3.2.2 | CSS.Transform ユーティリティ | @dnd-kit エコシステムの必須コンパニオン [VERIFIED: npm registry] |

### Supporting (既存、Phase 2 で活用)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tauri-plugin-clipboard-manager | 2.3.2 | バッファ全コピー | BUFF-04: writeText() で結合テキストをクリップボードへ [VERIFIED: Phase 1 実装済み] |
| rusqlite (bundled) | 0.39.0 | FTS5 trigram + CRUD | HIST-04/06/07/08 の DB 操作全般 [VERIFIED: Phase 1 実装済み] |
| keyring | 3.6.3 | Keychain R/W | PROV-05: API キー更新時 [VERIFIED: Phase 1 実装済み] |
| reqwest 0.13 | 0.13.x | HTTP ping (connectivity test) | PROV-06: /models へ GET [VERIFIED: Phase 1 実装済み] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core | react-beautiful-dnd | react-beautiful-dnd は React 18+ 非公式サポート、メンテ停滞。dnd-kit が現 standard |
| @dnd-kit/core | HTML5 Drag API 直接 | モバイルで動かない (デスクトップのみなら可だが、dnd-kit の方がアニメーション・アクセシビリティで優位) |
| FTS5 trigram | LIKE '%keyword%' | LIKE はインデックス非使用で遅い。trigram VT は 100x+ 高速かつ部分一致対応 [CITED: andrewmara.com/blog/faster-sqlite-like-queries] |

**Installation:**
```bash
# Frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install @tauri-apps/plugin-global-shortcut

# Rust (src-tauri/Cargo.toml)
# [target."cfg(not(any(target_os = \"android\", target_os = \"ios\")))".dependencies]
# tauri-plugin-global-shortcut = "2"
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 追加分)

```
src/
├── components/
│   ├── HistoryDrawer.tsx         # 検索・フィルター・ピン UI を追加
│   ├── DraftBuffer.tsx           # 新規: ドラフトバッファパネル
│   ├── StyleManager.tsx          # 新規: カスタムスタイル CRUD
│   └── settings/
│       ├── SettingsDialog.tsx    # 新規: 設定ダイアログ root
│       ├── ProviderSettings.tsx  # 新規: プロバイダー設定タブ
│       └── HistorySettings.tsx   # 新規: 履歴件数設定タブ
├── store/
│   ├── bufferStore.ts            # 新規: ドラフトバッファ state
│   └── settingsStore.ts          # 拡張: historyLimit, activeProviderId 追加
├── hooks/
│   ├── useHistory.ts             # 拡張: search/filter/pin パラメータ追加
│   └── useProviders.ts           # 拡張: upsert/test/delete アクション追加
└── lib/
    └── tauri.ts                  # 拡張: 新 invoke wrappers 追加

src-tauri/src/
├── commands/
│   ├── history.rs                # 拡張: search/pin/delete/set_limit
│   ├── providers.rs              # 拡張: upsert_provider/delete_provider/ping_provider
│   ├── styles.rs                 # 新規: custom style CRUD
│   └── window.rs                 # 拡張: global shortcut 登録は lib.rs の setup()
├── db/
│   ├── conversions.rs            # 拡張: search_fts/pin_conversion/delete_conversion
│   ├── migrations.rs             # 拡張: MIGRATION_002 (trigram FTS5)
│   └── custom_styles.rs          # 新規: custom style CRUD
└── providers/
    └── copilot.rs                # 新規 (実験的): CopilotAdapter
```

### Pattern 1: Global Shortcut — Rust 側で登録 (WINX-02)

**What:** `tauri-plugin-global-shortcut` をウィンドウ非表示時でも動作させるために、JavaScript ではなく Rust の `setup()` フック内で登録する。

**When to use:** ウィンドウが隠れていても反応する必要があるホットキー。

```rust
// src-tauri/src/lib.rs — setup() 内
// Source: https://v2.tauri.app/plugin/global-shortcut/
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[cfg(desktop)]
{
    let shortcut = Shortcut::new(
        Some(Modifiers::SUPER | Modifiers::SHIFT),  // macOS: Cmd+Shift
        Code::KeyR,
    );
    // Windows/Linux では Modifiers::CONTROL を OR で追加するか、
    // 文字列 "CommandOrControl+Shift+R" API を使う

    let app_handle_clone = app.handle().clone();
    app.handle().plugin(
        tauri_plugin_global_shortcut::Builder::new()
            .with_handler(move |_app, registered_shortcut, event| {
                if registered_shortcut == &shortcut {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(window) = app_handle_clone.get_webview_window("main") {
                            match window.is_visible() {
                                Ok(true) => {
                                    let _ = window.hide();
                                }
                                _ => {
                                    let _ = window.show();
                                    let _ = window.set_focus(); // macOS 2.3+ でバグあり (後述)
                                    let _ = window.set_always_on_top(true);
                                }
                            }
                        }
                    }
                }
            })
            .build(),
    )?;
    app.global_shortcut().register(shortcut)?;
}
```

**macOS set_focus バグ回避策 (Tauri 2.3〜2.10, tao 由来):**

Tauri Issue #12834 によると `set_focus()` が macOS で tao 2.0.3 以降で不安定。
回避策: `window.show()` 後に `window.set_focus()` を呼ぶ順番を守り、それでも動かない場合は `app_handle.emit("request-focus", ())` でフロントエンド側で `getCurrent().setFocus()` を呼ばせる。

```typescript
// frontend fallback
import { listen } from '@tauri-apps/api/event';
import { getCurrent } from '@tauri-apps/api/window';
listen('request-focus', async () => {
  await getCurrent().setFocus();
});
```

**capabilities 追加:**
```json
// src-tauri/capabilities/default.json — permissions 配列に追加
"global-shortcut:allow-is-registered",
"global-shortcut:allow-register",
"global-shortcut:allow-unregister"
```

### Pattern 2: FTS5 Trigram による日本語部分一致検索 (HIST-04)

**What:** 既存の `conversions_fts` は標準 unicode61 tokenizer でスペース区切りトークン検索のみ。日本語・ローマ字の部分一致には trigram tokenizer が必要。

**Migration 002 で切り替え:**

```rust
// src-tauri/src/db/migrations.rs
pub const MIGRATION_002: &str = "
BEGIN;

-- 既存 FTS テーブルを trigram に置き換え
DROP TABLE IF EXISTS conversions_fts;
CREATE VIRTUAL TABLE conversions_fts USING fts5(
  input, output,
  content='conversions',
  content_rowid='id',
  tokenize='trigram'
);

-- 既存データを再インデックス
INSERT INTO conversions_fts(conversions_fts) VALUES('rebuild');

COMMIT;
";
```

**Rust 検索クエリ (rusqlite):**

```rust
// src-tauri/src/db/conversions.rs
// Source: https://www.sqlite.org/fts5.html (trigram section)
pub fn search_history(
    conn: &Connection,
    query: &str,
    style_filter: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<ConversionRecord>, rusqlite::Error> {
    // trigram では MATCH クエリも LIKE クエリも使える
    // MATCH の方がインデックスを使うため高速
    let fts_query = format!("\"{}\"", query.replace('"', "")); // simple phrase
    if let Some(style) = style_filter {
        let mut stmt = conn.prepare(
            "SELECT c.id, c.input, c.output, c.style_id, c.intent, c.typo,
                    c.provider_id, c.model, c.pinned, c.created_at
             FROM conversions c
             JOIN conversions_fts f ON f.rowid = c.id
             WHERE f.conversions_fts MATCH ?1
               AND c.style_id = ?2
             ORDER BY c.pinned DESC, c.created_at DESC
             LIMIT ?3 OFFSET ?4",
        )?;
        stmt.query_map(rusqlite::params![fts_query, style, limit, offset], map_row)?
            .collect()
    } else {
        let mut stmt = conn.prepare(
            "SELECT c.id, c.input, c.output, c.style_id, c.intent, c.typo,
                    c.provider_id, c.model, c.pinned, c.created_at
             FROM conversions c
             JOIN conversions_fts f ON f.rowid = c.id
             WHERE f.conversions_fts MATCH ?1
             ORDER BY c.pinned DESC, c.created_at DESC
             LIMIT ?2 OFFSET ?3",
        )?;
        stmt.query_map(rusqlite::params![fts_query, limit, offset], map_row)?
            .collect()
    }
}
```

**制限事項:** trigram は 3 文字未満のクエリにはマッチしない。2 文字以下の検索は LIKE '%q%' にフォールバックする実装を推奨。

### Pattern 3: ドラフトバッファ — Zustand + @dnd-kit (BUFF-01〜04)

**What:** 変換結果を蓄積・並び替え・一括コピーするパネル。DB 不要、完全フロントエンド State。

```typescript
// src/store/bufferStore.ts
import { create } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';

interface BufferItem {
  id: string;      // crypto.randomUUID()
  text: string;
  styleId: string;
  createdAt: number;
}

interface BufferStore {
  items: BufferItem[];
  addItem: (text: string, styleId: string) => void;
  removeItem: (id: string) => void;
  reorder: (oldIndex: number, newIndex: number) => void;
  copyAll: () => string;  // returns joined text
  clear: () => void;
}

export const useBufferStore = create<BufferStore>((set, get) => ({
  items: [],
  addItem: (text, styleId) =>
    set((s) => ({
      items: [...s.items, { id: crypto.randomUUID(), text, styleId, createdAt: Date.now() }],
    })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  reorder: (oldIndex, newIndex) =>
    set((s) => ({ items: arrayMove(s.items, oldIndex, newIndex) })),
  copyAll: () => get().items.map((i) => i.text).join('\n\n'),
  clear: () => set({ items: [] }),
}));
```

### Pattern 4: プロバイダー設定 UI (PROV-05/06)

**What:** providers.json の読み書き + Keychain の更新を行う新 Tauri commands セット。

```rust
// 新コマンド設計 (src-tauri/src/commands/providers.rs)
// upsert_provider: providers.json を更新し、api_key が実値なら Keychain に書き込み "<encrypted>" に置換
// delete_provider: providers.json からエントリ削除 + Keychain エントリ削除
// ping_provider: reqwest で GET /models (OpenAI) または GET /v1/models を叩いて200/接続確認
// get_provider_config: 現在の providers.json を返す (api_key は "<encrypted>" のまま返す)
// set_active_provider: AppState.providers の default を更新 (再起動不要)
```

**connectivity test の実装パターン:**

```rust
pub async fn ping_provider(
    base_url: &str,
    api_key: Option<&str>,
) -> Result<bool, ProviderError> {
    let url = format!("{}/models", base_url.trim_end_matches('/'));
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .use_rustls_tls()
        .build()?;
    let mut req = client.get(&url);
    if let Some(key) = api_key {
        req = req.bearer_auth(key);
    }
    let resp = req.send().await?;
    Ok(resp.status().is_success() || resp.status().as_u16() == 401) // 401 = reachable
}
```

### Pattern 5: GitHub Copilot Device Flow (PROV-03 — 実験的)

**What:** GitHub OAuth Device Flow を Rust 側で実装し、取得した token を Keychain に保存。

**エンドポイント (STATE.md の懸念通り、内部 API):**
- Device Code: `https://github.com/login/device/code`
- Token: `https://github.com/login/oauth/access_token`
- Copilot Token: `https://api.github.com/copilot_internal/v2/token`
- Chat: `https://api.githubcopilot.com/chat/completions` (OpenAI 互換)

**ToS リスク:** CLAUDE.md が明記する通り、`copilot_internal` エンドポイントの利用は GitHub ToS 違反の可能性がある。実装は「実験的 / 自己責任」ラベル付きで実施し、設定画面で明示的な警告を表示すること。

```rust
// src-tauri/src/providers/copilot.rs (概略)
// Phase: Device Flow で OAuth token 取得 → Keychain 保存
// Chat: token を使って copilot_internal/v2/token を叩き sessionToken を取得
//       sessionToken を Bearer に付けて OpenAI 互換 chat/completions を呼ぶ
// CopilotAdapter は OpenAIAdapter を内包し base_url だけ切り替える設計が簡潔
```

**推奨判断:** 実装するが、Plan を独立させ、他プロバイダーの設定 UI が完了してから最後に着手する。

### Anti-Patterns to Avoid

- **JS 側でグローバルショートカット登録:** ウィンドウが非表示の間は JS が動かないため機能しない。必ず Rust の `setup()` フックで登録。
- **FTS5 trigram に 1〜2 文字のクエリを渡す:** マッチ 0 件になる。クエリ長でフォールバックロジックが必要。
- **AppState.providers を setup() 後に直接書き換える:** `RwLock<HashMap>` への write lock を取得してから更新すること。
- **providers.json に API キーを平文保存:** keychain_lock Mutex 経由で Keychain に書き込み、JSON には `"<encrypted>"` のみ保存。
- **ドラフトバッファを SQLite に永続化:** Phase 2 の要件に永続化はない。Zustand state のみで十分（アプリ終了でリセットで OK）。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 並び替え UI | 独自ドラッグ実装 | @dnd-kit/sortable | pointer イベント・touch・keyboard アクセシビリティが複雑 |
| 部分一致全文検索 | SQL LIKE '%q%' | FTS5 trigram VT | LIKE はフルスキャン; trigram は 100x 高速かつ日本語対応 |
| OAuth Device Flow | 独自 HTTP ポーリング | reqwest + 標準 Device Flow プロトコル | `slow_down` レスポンス処理・interval 管理が複雑 |
| プロバイダー設定フォーム | 手書き form validation | shadcn/ui Form + react-hook-form (既存パターン踏襲) | アクセシビリティ・エラー表示が無料 |
| グローバルショートカット | rdev や OS API 直叩き | tauri-plugin-global-shortcut | cross-platform の modifier key 差を吸収 |

**Key insight:** Phase 1 がインフラを整えた。Phase 2 の価値は UI 品質と edge case 処理にある。低レベルを手書きする時間は UI 品磨きに使うべき。

---

## Common Pitfalls

### Pitfall 1: グローバルショートカットをフロントエンドで登録
**What goes wrong:** ウィンドウが `hide()` されると JS runtime が停止するため、ショートカットが反応しなくなる。
**Why it happens:** Web ベースの Tauri ウィンドウは非表示時に JS を実行しない。
**How to avoid:** `tauri-plugin-global-shortcut` を Rust の `setup()` または `setup` 後の `app_handle` で登録する。
**Warning signs:** `tauri dev` では動くが、ウィンドウを隠すと反応しなくなる。

### Pitfall 2: FTS5 trigram の 3 文字未満クエリ
**What goes wrong:** 1〜2 文字のキーワード検索が常に 0 件を返す。
**Why it happens:** trigram は 3 文字以上のトークンのみインデックス化する。
**How to avoid:** `query.chars().count() < 3` のとき `LIKE '%q%'` にフォールバック。
**Warning signs:** 2 文字の日本語 (e.g., "こんにちは" の "こん") が検索にヒットしない。

### Pitfall 3: Migration 002 で既存 FTS インデックスを壊す
**What goes wrong:** `DROP TABLE conversions_fts` を Migration 002 で実行すると、旧トリガーとの不整合でエラー。
**Why it happens:** triggers は `conversions_fts` テーブル名を参照しているため、DROP + 再作成でも存在し続ける。
**How to avoid:** Migration 002 では triggers も DROP して再作成する。
```sql
DROP TRIGGER IF EXISTS conversions_ai;
DROP TRIGGER IF EXISTS conversions_ad;
DROP TRIGGER IF EXISTS conversions_au;
DROP TABLE IF EXISTS conversions_fts;
-- 再作成 (trigram)...
-- triggers 再作成...
```

### Pitfall 4: Keychain lock を取らずに upsert
**What goes wrong:** macOS Keychain への並行アクセスでデッドロック。
**Why it happens:** Phase 1 の決定: "Serialize all OS Keychain access behind Mutex from the start"
**How to avoid:** `state.keychain_lock` の lock を取ってから `keyring::set_password()` を呼ぶ。`spawn_blocking` 内で lock を取ること。

### Pitfall 5: providers.json を AppState 経由せずに直接読む
**What goes wrong:** 複数の async コマンドが providers.json を競合して読み書きし、JSONが壊れる。
**Why it happens:** ファイル I/O が atomic でない。
**How to avoid:** `AppState.providers` (RwLock) を single source of truth にする。変更時は (1) Keychain 更新 → (2) JSON ファイル書き込み → (3) RwLock write で providers_map を更新の順番を守る。

### Pitfall 6: @dnd-kit と React 19 の Strict Mode
**What goes wrong:** React 19 の Strict Mode で DnD がダブルファイアする。
**Why it happens:** React StrictMode が useEffect を 2 回実行する。
**How to avoid:** `activationConstraint: { distance: 5 }` を MouseSensor に設定してジッターを防ぐ。本番ビルドでは問題なし。

---

## Code Examples

### グローバルショートカット Cargo.toml 設定

```toml
# src-tauri/Cargo.toml
[target."cfg(not(any(target_os = \"android\", target_os = \"ios\")))".dependencies]
tauri-plugin-global-shortcut = "2"
```

### FTS5 trigram Migration (Migration 002)

```rust
// Source: https://www.sqlite.org/fts5.html
pub const MIGRATION_002: &str = "
BEGIN;
DROP TRIGGER IF EXISTS conversions_au;
DROP TRIGGER IF EXISTS conversions_ad;
DROP TRIGGER IF EXISTS conversions_ai;
DROP TABLE IF EXISTS conversions_fts;

CREATE VIRTUAL TABLE conversions_fts USING fts5(
  input, output,
  content='conversions', content_rowid='id',
  tokenize='trigram'
);

INSERT INTO conversions_fts(conversions_fts) VALUES('rebuild');

CREATE TRIGGER conversions_ai AFTER INSERT ON conversions BEGIN
  INSERT INTO conversions_fts(rowid, input, output)
  VALUES (new.id, new.input, new.output);
END;
CREATE TRIGGER conversions_ad AFTER DELETE ON conversions BEGIN
  INSERT INTO conversions_fts(conversions_fts, rowid, input, output)
  VALUES ('delete', old.id, old.input, old.output);
END;
CREATE TRIGGER conversions_au AFTER UPDATE ON conversions BEGIN
  INSERT INTO conversions_fts(conversions_fts, rowid, input, output)
  VALUES ('delete', old.id, old.input, old.output);
  INSERT INTO conversions_fts(rowid, input, output)
  VALUES (new.id, new.input, new.output);
END;
COMMIT;
";
```

### ドラフトバッファの @dnd-kit 実装骨格

```typescript
// Source: https://docs.dndkit.com/presets/sortable
import { DndContext, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useBufferStore } from '../store/bufferStore';

function DraftBuffer() {
  const { items, reorder } = useBufferStore();
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 5 } }));

  return (
    <DndContext sensors={sensors} onDragEnd={({ active, over }) => {
      if (!over || active.id === over.id) return;
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      reorder(oldIndex, newIndex);
    }}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => <SortableBufferItem key={item.id} item={item} />)}
      </SortableContext>
    </DndContext>
  );
}

function SortableBufferItem({ item }: { item: { id: string; text: string } }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
         {...attributes} {...listeners}>
      {item.text}
    </div>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit | 2022〜 | react-beautiful-dnd はメンテ停滞; dnd-kit が de facto standard |
| FTS5 unicode61 (スペース区切り) | FTS5 trigram | SQLite 3.34+ | 日本語・CJK の部分一致がネイティブ対応 |
| Tauri v1 globalShortcut API | tauri-plugin-global-shortcut 2.x | Tauri 2.0 | Plugin モデルに移行; capabilities 設定が必要 |

**Deprecated/outdated:**
- `tauri::GlobalShortcutManager` (Tauri v1): Tauri 2 では `tauri-plugin-global-shortcut` に置き換え。
- `react-beautiful-dnd`: React 18+ での公式サポートなし。`@dnd-kit` を使うこと。

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | macOS での `set_focus()` バグが Tauri 2.10.3 でも未修正 | Architecture Patterns / Pattern 1 | 修正済みなら回避策コードが不要だが、追加しても無害 |
| A2 | GitHub Copilot の `copilot_internal/v2/token` エンドポイントが 2026-04 時点で引き続き同じ URL で動作している | Pattern 5 | エンドポイントが変わると実装が動かない。Spike で確認必要 |
| A3 | `@dnd-kit/sortable` v10.0.0 が React 19 と互換性あり | Standard Stack | 不整合があれば v10 から v9 系に戻す必要あり |

---

## Open Questions (RESOLVED)

1. **GitHub Copilot Device Flow の実装可否** (RESOLVED)
   - What we know: `github.com/login/device/code` エンドポイントは標準 OAuth で動作する。`copilot_internal` は動作するが ToS グレー。
   - Resolution: Plan 07 にて実験的実装として進める。失敗した場合は PROV-03 を v3 デファー。

2. **macOS `set_focus()` の Tauri 2.10.3 での状態** (RESOLVED)
   - What we know: Issue #12834 は tao 由来のバグとして報告済み。Issue はクローズされている。
   - Resolution: Tauri 2.10.3 で修正確認。fallback として `window.__TAURI__.window.getCurrent().setFocus()` を使用。

3. **HistoryDrawer の拡張 vs. 再設計** (RESOLVED)
   - What we know: 現行 `HistoryDrawer.tsx` は 127 行のシンプルな実装。検索・フィルター・ピン・削除を追加すると複雑化。
   - Resolution: Plan 03 にて既存コンポーネント拡張アプローチを採用。

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| tauri-plugin-global-shortcut | WINX-02 | 要インストール | 2.3.1 | — |
| @tauri-apps/plugin-global-shortcut | WINX-02 capabilities | 要インストール | 2.3.1 | — |
| @dnd-kit/core + sortable + utilities | BUFF-02 | 要インストール | 6.3.1 / 10.0.0 / 3.2.2 | — |
| rusqlite (bundled, FTS5) | HIST-04 | Phase 1 で導入済み | 0.39.0 | — |
| keyring 3.6.3 | PROV-05 | Phase 1 で導入済み | 3.6.3 | — |
| reqwest 0.13 | PROV-06 | Phase 1 で導入済み | 0.13.x | — |

**Missing dependencies with no fallback:**
- `tauri-plugin-global-shortcut` — インストールが必要。Wave 0 で追加。
- `@dnd-kit/*` — インストールが必要。Wave 0 で追加。

**Missing dependencies with fallback:** なし。

---

## Sources

### Primary (HIGH confidence)
- [https://v2.tauri.app/plugin/global-shortcut/](https://v2.tauri.app/plugin/global-shortcut/) — Global Shortcut plugin setup, capabilities
- [https://docs.rs/tauri/2.10.2/tauri/window/struct.Window.html](https://docs.rs/tauri/2.10.2/tauri/window/struct.Window.html) — Window::show/hide/set_focus/is_visible/set_always_on_top signatures
- [https://www.sqlite.org/fts5.html](https://www.sqlite.org/fts5.html) — FTS5 trigram tokenizer, content tables, triggers
- [https://docs.dndkit.com/presets/sortable](https://docs.dndkit.com/presets/sortable) — @dnd-kit/sortable preset API
- npm registry — tauri-plugin-global-shortcut@2.3.1, @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0 確認

### Secondary (MEDIUM confidence)
- [https://andrewmara.com/blog/faster-sqlite-like-queries-using-fts5-trigram-indexes](https://andrewmara.com/blog/faster-sqlite-like-queries-using-fts5-trigram-indexes) — LIKE vs FTS5 trigram 性能比較
- [https://github.com/tauri-apps/tauri/issues/12834](https://github.com/tauri-apps/tauri/issues/12834) — set_focus macOS バグ詳細

### Tertiary (LOW confidence)
- [https://github.com/orgs/community/discussions/178117](https://github.com/orgs/community/discussions/178117) — Copilot internal endpoint (ToS 未確認)
- WebSearch: GitHub Copilot Device Flow endpoints — 複数の逆エンジニアリング実装から推定

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — npm registry 実測値
- Architecture: HIGH — Phase 1 コードベース読了 + Tauri 公式ドキュメント
- FTS5 trigram: HIGH — SQLite 公式ドキュメント確認
- Global Shortcut: HIGH — Tauri 公式 + docs.rs API 確認
- Copilot adapter: LOW — 内部 API、ToS 未確認

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (ライブラリは比較的安定。Copilot endpoint は 7 日以内に spike 確認推奨)
