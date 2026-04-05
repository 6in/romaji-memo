# Romaji Memo

ローマ字入力をAIで日本語・英語・各種スタイルに変換するデスクトップアプリ。常に最前面に表示されるフローティングツールとして動作し、チャット・ドキュメント執筆・コードコメントなど幅広い場面で使える。

**Core Value:** ローマ字をタイプするだけで、スペースなし連続入力でも文脈からAIが正しく日本語・英語に変換し、ワンクリックでコピーできること。

## Prerequisites

- Node.js 18+
- Rust (install via [rustup](https://rustup.rs))
- macOS 12+ or Windows 10+

## Setup

### 1. Register an API Key in OS Keychain

API keys are stored in the OS Keychain only — never in config files or localStorage.

The app uses `Entry::new("romaji-memo", provider_id)` internally (keyring crate v3.6.3), where:
- service = `romaji-memo` (fixed)
- account = provider_id (e.g., `anthropic`, `openai`)

**macOS — Register API key in Keychain:**

```bash
# Anthropic (Claude) — recommended default provider
security add-generic-password -s "romaji-memo" -a "anthropic" -w "sk-ant-YOUR_KEY_HERE"

# OpenAI (optional)
security add-generic-password -s "romaji-memo" -a "openai" -w "sk-YOUR_KEY_HERE"
```

To update an existing key, delete the old entry first:

```bash
security delete-generic-password -s "romaji-memo" -a "anthropic"
security add-generic-password -s "romaji-memo" -a "anthropic" -w "sk-ant-YOUR_KEY_HERE"
```

**Windows — Register API key in Credential Manager:**

```powershell
# Anthropic (Claude) — recommended default provider
cmdkey /add:romaji-memo /user:anthropic /pass:sk-ant-YOUR_KEY_HERE

# OpenAI (optional)
cmdkey /add:romaji-memo /user:openai /pass:sk-YOUR_KEY_HERE
```

The `/add:romaji-memo` target and `/user:anthropic` username must match exactly what
`Entry::new("romaji-memo", "anthropic")` produces. The keyring crate v3.6.3 stores
credentials as a Windows Credential Manager "Generic Credential" type.

If credentials are not found at runtime, verify in Credential Manager
(Control Panel > User Accounts > Credential Manager > Windows Credentials) that a
Generic Credential entry exists with target `romaji-memo` and username `anthropic`.

To update an existing key on Windows:

```powershell
cmdkey /delete:romaji-memo
cmdkey /add:romaji-memo /user:anthropic /pass:sk-ant-YOUR_KEY_HERE
```

### 2. Ollama (Local — no API key needed)

For fully offline operation, use Ollama:

1. Install Ollama from https://ollama.ai
2. Pull a model: `ollama pull gemma3:12b`
3. Ollama must be running on `localhost:11434` before launching the app

No API key registration is required for Ollama. Set the default provider to `ollama-local`
in `providers.json`.

## Development

```bash
npm install
npx tauri dev
```

## Build

```bash
npx tauri build
```

The built application binary will be in `src-tauri/target/release/bundle/`.

## Usage

1. **Type romaji** in the input area — spaces are optional; the AI infers word boundaries
2. **Select a conversion style** from the dropdown (8 presets available)
3. **Click "変換"** or press **Cmd/Ctrl+Enter** to convert
4. **View the result** — intent annotation ("意図:") and typo corrections ("修正:") appear below
5. **Click the copy icon** to copy the result to clipboard
6. **Toggle always-on-top** with the pin icon in the title bar
7. **Toggle dark/light theme** with the sun/moon icon in the title bar
8. **Open history** with the drawer button at the bottom of the window

### Conversion Styles

| Style | Description |
|-------|-------------|
| 標準 | Standard Japanese |
| 丁寧 | Polite Japanese |
| 大阪弁 | Osaka dialect |
| おかま | Feminine speech style |
| 武士 | Samurai speech style |
| ギャル | Gyaru speech style |
| ビジネス | Business formal Japanese |
| AIプロンプト | AI prompt style (English) |

### History

- The bottom drawer shows past conversions with style, preview, and timestamp
- Click any history item to reload its romaji input into the text area
- History persists across app restarts (stored in SQLite)

## Provider Configuration

The app ships with a `providers.json` in the app data directory:

- **Default provider:** Anthropic (Claude Haiku)
- **Ollama (local):** Pre-configured at `http://localhost:11434/v1`
- **OpenAI:** Disabled by default; enable by setting `"enabled": true`

To modify providers, edit `providers.json` in the Tauri app data directory:
- macOS: `~/Library/Application Support/romaji-memo/providers.json`
- Windows: `%APPDATA%\romaji-memo\providers.json`

API keys are stored in OS Keychain only — never in `providers.json` or any config file.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Desktop shell | Tauri 2.10.3 |
| Frontend | React 19 + TypeScript 5 |
| Bundler | Vite 6 |
| Styling | Tailwind CSS v4 + shadcn/ui |
| State | Zustand 5 + TanStack Query 5 |
| Icons | Lucide React |
| Backend runtime | Rust (stable 1.77.2+) |
| Database | SQLite via rusqlite 0.39.0 (bundled, FTS5) |
| Keychain | keyring 3.6.3 (OS Keychain / Credential Manager) |
| HTTP | reqwest 0.13 (rustls-tls) |

## Security Notes

- API keys are stored exclusively in OS Keychain (macOS Security framework / Windows Credential Manager)
- No API keys are written to disk, config files, or localStorage
- All AI HTTP calls are made from the Rust backend — keys never reach the frontend
- The `providers.json` file shows `"<encrypted>"` as a placeholder for key fields

## Performance Targets

- Launch time: under 3 seconds (cold start)
- Memory usage: under 200MB total (Tauri main process + WebView)
- Platform: macOS 12+ and Windows 10+
