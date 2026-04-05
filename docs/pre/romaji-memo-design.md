# Romaji Memo - 要件定義・設計書

## 概要

ローマ字入力をAIで日本語・英語・各種スタイルに変換するデスクトップアプリ。
常に最前面に表示されるフローティングツールとして動作し、変換履歴をSQLiteに保存する。

---

## 1. 要件定義

### 1.1 機能要件

#### コア機能
- ローマ字入力をAIで変換（日本語・英語・スタイル指定）
- タイポ・打ち間違いを文脈から推測して補正
- 変換結果の確認・編集後にクリップボードへコピー
- 変換意図（intent）の表示（変換が意図通りかの確認）
- **スペースなし連続入力対応**：単語間スペースなしのローマ字でも文節境界をAIが推定して正しく変換（例: `korehadouda` → 「これはどうだ」）
- **長文ドキュメントモード**：段落単位で変換・蓄積し、最後にまとめてエクスポート（md / txt）。思考のリズムを途切れさせずに書き続けられることを優先する

#### スタイル
- 標準 / 丁寧 / 大阪弁 / おかま風 / 武士 / ギャル / ビジネス / AIプロンプト（英語）
- カスタムスタイルの追加・編集・削除

#### 下書きバッファ
- 変換済みテキストを複数件ストック
- バッファ内の順序変更・個別削除
- バッファ全体をまとめてコピー

#### 履歴管理（SQLite）
- 変換履歴の永続保存
- 履歴から再利用（クリックで入力欄に再セット）
- キーワード検索・スタイル絞り込み
- ピン留め（よく使う変換を固定）
- 件数上限設定（デフォルト1000件）

#### ウィンドウ制御
- 常に最前面表示（Always on Top）のトグル
- グローバルホットキーで呼び出し（デフォルト: Cmd/Ctrl+Shift+R）
- ウィンドウサイズ・位置の記憶
- ミニモード（入力欄のみの最小化ビュー）

#### クリップボード連携
- 変換結果をワンクリックコピー
- クリップボード監視モード（コピーされたテキストを自動で入力欄に取り込む）

### 1.2 非機能要件

- 起動時間: 3秒以内
- 変換レスポンス: プロバイダー依存（Ollama: 2秒以内目標）
- メモリ使用量: 200MB以下
- 対応OS: macOS 12+, Windows 10+
- オフライン動作: Ollama / LM Studio 選択時は完全オフライン

---

## 2. AIプロバイダー設計

### 2.1 対応プロバイダー

| プロバイダー | 形式 | 備考 |
|---|---|---|
| Anthropic | 独自API | claude-sonnet / haiku |
| OpenAI | OpenAI互換 | gpt-4o等 |
| Ollama | OpenAI互換 | localhost:11434 |
| OpenRouter | OpenAI互換 | 多モデル対応 |
| LM Studio | OpenAI互換 | localhost:1234 |
| GitHub Copilot SDK | 独自SDK | Device Flow OAuth認証 |

### 2.2 アダプター設計

```
ProviderAdapter (trait)
├── AnthropicAdapter   # 独自フォーマット
├── OpenAIAdapter      # OpenAI / Ollama / OpenRouter / LM Studio 共通
└── CopilotAdapter     # GitHub Copilot SDK（Device Flow OAuth）
```

#### ProviderAdapter トレイト（Rust）

```rust
#[async_trait]
pub trait ProviderAdapter: Send + Sync {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse>;
    fn name(&self) -> &str;
    fn supports_streaming(&self) -> bool;
}

pub struct CompletionRequest {
    pub system: String,
    pub messages: Vec<Message>,
    pub model: String,
    pub max_tokens: u32,
}

pub struct CompletionResponse {
    pub content: String,
    pub model: String,
    pub usage: Option<TokenUsage>,
}
```

#### GitHub Copilot アダプター

- Device Flow OAuth（`github.com/login/device/code`）
- トークンをOS Keychainに保存（`keyring` crate）
- 期限切れ時の自動リフレッシュ
- エンドポイント: `https://api.githubcopilot.com/chat/completions`

### 2.3 プロバイダー設定スキーマ（JSON）

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
      "id": "copilot",
      "name": "GitHub Copilot",
      "adapter": "copilot",
      "model": "gpt-4o",
      "enabled": false
    }
  ],
  "default_provider": "anthropic"
}
```

APIキーはOS Keychain（macOS: Keychain, Windows: Credential Manager）に保存。設定ファイルには`<encrypted>`プレースホルダーのみ。

---

## 3. 変換プロンプト設計

### 3.1 システムプロンプト（テンプレート）

```
あなたはローマ字入力を変換するエンジンです。

基本ルール：
- 入力はローマ字（ヘボン式・訓令式混在可）または英単語の混在テキストです
- **スペースなしの連続ローマ字入力でも文節境界を文脈から推定して正しく変換すること**（スペースは区切り記号ではなくオプション扱い）
- タイポ・打ち間違いも文脈から推測して正しく変換してください
- 大文字始まりの単語は固有名詞として英語のまま残してください
- 技術用語はカタカナ優先（saabu→サーバ等）
- 必ずJSONのみ返してください。説明・マークダウン・バッククォートは一切不要です

スタイル指示：{style_prompt}

{context_block}

出力形式（JSONのみ）：
{"converted":"変換結果","intent":"この入力の意図を10文字程度で","typo":"タイポ修正内容。なければ空文字"}
```

### 3.2 スタイル定義（カスタマイズ可能）

```json
[
  { "id": "standard", "label": "標準",   "emoji": "📝", "prompt": "自然な日本語に変換してください。" },
  { "id": "polite",   "label": "丁寧",   "emoji": "🎩", "prompt": "丁寧語・敬語。です・ます調で統一。" },
  { "id": "osaka",    "label": "大阪弁", "emoji": "🐡", "prompt": "大阪弁・関西弁。〜やん、〜ねん等を自然に使用。" },
  { "id": "okama",    "label": "おかま", "emoji": "💅", "prompt": "おかまっぽい口調。〜わよ、〜かしら等。" },
  { "id": "bushi",    "label": "武士",   "emoji": "⚔️", "prompt": "武士言葉・時代劇風。〜でござる等。" },
  { "id": "gal",      "label": "ギャル", "emoji": "✌️", "prompt": "ギャル語・若者言葉。マジ、てか等。" },
  { "id": "business", "label": "ビジネス","emoji": "💼", "prompt": "ビジネスメール敬語。〜かと存じます等。" },
  { "id": "prompt",   "label": "AIプロンプト","emoji": "🤖", "prompt": "効果的な英語AIプロンプトに変換。意図を正確に英語で。" }
]
```

---

## 4. データベース設計（SQLite）

```sql
-- 変換履歴
CREATE TABLE conversions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  input       TEXT    NOT NULL,          -- ローマ字原文
  output      TEXT    NOT NULL,          -- 変換結果
  style_id    TEXT    NOT NULL,          -- スタイルID
  intent      TEXT,                      -- AI解釈
  typo        TEXT,                      -- タイポ修正内容
  provider_id TEXT    NOT NULL,          -- 使用プロバイダー
  model       TEXT    NOT NULL,          -- 使用モデル
  pinned      INTEGER DEFAULT 0,         -- ピン留め (0/1)
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- カスタムスタイル
CREATE TABLE custom_styles (
  id          TEXT    PRIMARY KEY,
  label       TEXT    NOT NULL,
  emoji       TEXT    NOT NULL,
  prompt      TEXT    NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- アプリ設定
CREATE TABLE settings (
  key         TEXT    PRIMARY KEY,
  value       TEXT    NOT NULL,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_conversions_created ON conversions(created_at DESC);
CREATE INDEX idx_conversions_style   ON conversions(style_id);
CREATE INDEX idx_conversions_pinned  ON conversions(pinned DESC, created_at DESC);
CREATE VIRTUAL TABLE conversions_fts USING fts5(input, output, content='conversions', content_rowid='id');
```

---

## 5. アーキテクチャ設計

### 5.1 ディレクトリ構成

```
romaji-memo/
├── src-tauri/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs              # Tauriセットアップ、ウィンドウ設定
│       ├── commands/
│       │   ├── convert.rs       # 変換コマンド（invoke）
│       │   ├── history.rs       # 履歴CRUD
│       │   ├── settings.rs      # 設定管理
│       ├── providers/
│       │   ├── mod.rs           # ProviderAdapter trait
│       │   ├── anthropic.rs
│       │   ├── openai.rs        # Ollama / OpenAI / OpenRouter / LMStudio 共通
│       │   └── copilot.rs       # GitHub Copilot（Device Flow）
│       ├── db/
│       │   ├── mod.rs           # DB接続・マイグレーション
│       │   ├── conversions.rs
│       │   └── settings.rs
│       └── keychain.rs          # OS Keychain連携
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Converter.tsx        # メイン変換UI
│   │   ├── History.tsx          # 履歴パネル（ドロワー）
│   │   ├── DraftBuffer.tsx      # 下書きバッファ
│   │   ├── StyleSelector.tsx    # スタイル選択
│   │   └── Settings.tsx         # 設定画面
│   ├── hooks/
│   │   ├── useConvert.ts
│   │   ├── useHistory.ts
│   │   └── useProviders.ts
│   └── lib/
│       ├── tauri.ts             # invoke wrappers（型付き）
│       └── prompts.ts           # プロンプトテンプレート
│
├── tauri.conf.json
└── package.json
```

### 5.2 主要Tauriコマンド

```rust
// 変換
#[tauri::command]
async fn convert(input: String, style_id: String, context: Vec<Message>, provider_id: String)
  -> Result<ConvertResult>

// 履歴
#[tauri::command]
async fn get_history(limit: i64, offset: i64, style_filter: Option<String>, query: Option<String>)
  -> Result<Vec<ConversionRecord>>

#[tauri::command]
async fn toggle_pin(id: i64) -> Result<()>

#[tauri::command]
async fn delete_conversion(id: i64) -> Result<()>

// ウィンドウ
#[tauri::command]
async fn toggle_always_on_top(window: tauri::Window) -> Result<()>

// プロバイダー
#[tauri::command]
async fn list_providers() -> Result<Vec<ProviderConfig>>

#[tauri::command]
async fn save_provider(config: ProviderConfig, api_key: Option<String>) -> Result<()>

#[tauri::command]
async fn test_provider(provider_id: String) -> Result<bool>
```

### 5.3 ウィンドウ設定（tauri.conf.json）

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
  }],
  "globalShortcut": "CmdOrCtrl+Shift+R"
}
```

---

## 6. Cargo依存クレート

```toml
[dependencies]
tauri          = { version = "2", features = ["global-shortcut", "clipboard-manager"] }
tokio          = { version = "1", features = ["full"] }
reqwest        = { version = "0.12", features = ["json", "rustls-tls"] }
serde          = { version = "1", features = ["derive"] }
serde_json     = "1"
rusqlite       = { version = "0.32", features = ["bundled"] }
async-trait    = "0.1"
keyring        = "3"           # OS Keychain
tauri-plugin-global-shortcut = "2"
tauri-plugin-clipboard-manager = "2"
```

---

## 7. 実装優先順位

### Phase 1（MVP）
1. プロジェクトセットアップ（Tauri 2 + React + TypeScript）
2. AnthropicAdapter 実装
3. OpenAIAdapter 実装（Ollama対応）
4. 基本変換UI（スタイル選択・変換・コピー）
5. SQLite履歴保存・表示
6. Always on Top トグル

### Phase 2
7. CopilotAdapter（Device Flow OAuth）
8. グローバルホットキー
9. 下書きバッファ
10. 履歴検索・ピン留め
11. カスタムスタイル管理

### Phase 3
12. クリップボード監視モード
13. ミニモード
14. 設定画面（プロバイダー管理）

---

## 8. Claude Code向け実装メモ

- Tauri 2系を使用（v1ではない）
- フロントエンドはVite + React + TypeScript
- スタイリングはTailwind CSS（既存ArtifactのUIデザインを踏襲：ダークグリーンテーマ + ライトモード対応）
- 状態管理はZustand
- DB操作はRust側で完結、フロントからはinvoke経由のみ
- APIキーはOS Keychainのみ（設定ファイル・localStorageに保存しない）
- エラーハンドリングはResult型で統一、フロント側でtoast表示
