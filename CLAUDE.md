<!-- GSD:project-start source:PROJECT.md -->
## Project

**Romaji Memo**

ローマ字入力をAIで日本語・英語・各種スタイルに変換するデスクトップアプリ。常に最前面に表示されるフローティングツールとして動作し、チャット・ドキュメント執筆・コードコメントなど幅広い場面で使う。チームに配布予定。Tauri 2 + React + TypeScript で構築する。

**Core Value:** ローマ字をタイプするだけで、スペースなし連続入力でも文脈からAIが正しく日本語・英語に変換し、ワンクリックでコピーできること。

### Constraints

- **Tech Stack**: Tauri 2 + React + TypeScript — 設計書で決定済み
- **Security**: APIキーはOS Keychainのみ — 設定ファイル/localStorageに保存禁止
- **Performance**: 起動3秒以内、メモリ200MB以下
- **Cross-platform**: macOS 12+ / Windows 10+ 両対応
- **Offline**: Ollama / LM Studio 選択時は完全オフライン動作
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Tauri | 2.10.3 | Desktop shell, IPC bridge, OS integration | Latest stable Tauri 2. Provides global shortcuts, clipboard, Always on Top, transparent windows, and a rich plugin ecosystem. Dramatically smaller binary than Electron. macOS + Windows cross-platform. |
| Rust | stable (1.77.2+) | Backend runtime, AI HTTP calls, SQLite, keychain | Tauri's native layer. All AI calls, DB access, and keychain I/O run here — keeping secrets entirely off the frontend. |
| React | 19.x | UI framework | Already decided. React 19 with concurrent features integrates cleanly with Zustand 5 and Tailwind v4. Tauri's official `create-tauri-app` React template targets React 19. |
| TypeScript | 5.x | Type safety across frontend | Standard for all React + Tauri projects in 2025. Provides typed `invoke()` wrappers and autocompletion for IPC commands. |
| Vite | 6.x | Frontend bundler and dev server | Official Tauri 2 recommendation. Faster HMR than Webpack; native ESM. `@tauri-apps/cli` 2.x integrates directly with Vite's dev server on port 5173. |
### Frontend Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zustand | 5.0.x | Global UI state (provider selection, style selection, draft buffer, mini-mode flag) | All UI state that crosses component boundaries. Keep server/persisted data in TanStack Query; keep ephemeral local state in `useState`. |
| TanStack Query | 5.x | Async data fetching and caching for Tauri invoke calls | Wrap all `invoke()` calls that fetch history, settings, and provider lists. Gives automatic loading/error states and cache invalidation without boilerplate. |
| Tailwind CSS | 4.x | Utility-first styling | Installed via `@tailwindcss/vite` plugin — no `tailwind.config.js` required. Single `@import "tailwindcss"` in CSS. Dark/light theme with CSS variables via `@theme`. |
| shadcn/ui | latest (Tailwind v4 branch) | Accessible component primitives | Use for buttons, dialogs, drawers, dropdowns, toasts. shadcn/ui updated for Tailwind v4 in February 2025. Copy-paste model means no runtime library dependency. Radix UI primitives underneath. |
| Lucide React | latest | Icon set | Ships with shadcn/ui toolchain. Consistent, tree-shakable SVG icons. |
### Rust Crates
| Crate | Version | Purpose | Why |
|-------|---------|---------|-----|
| tauri | 2.10.3 | Core framework | Features: `global-shortcut`, `clipboard-manager` enabled in `Cargo.toml` `[features]` |
| tauri-plugin-global-shortcut | 2.3.x | Cmd/Ctrl+Shift+R hotkey | Official Tauri 2 plugin. Version 2.3.0 released 2025-06-25. |
| tauri-plugin-clipboard-manager | 2.3.2 | Read/write system clipboard | Official Tauri 2 plugin. Also enables clipboard watch mode for auto-capture feature. |
| tokio | 1.x | Async runtime | Tauri 2 embeds tokio internally; declare it explicitly with `features = ["full"]` for your own async tasks. |
| reqwest | 0.13.x | HTTP client for AI provider calls | Version 0.13.2 is current stable. Use `features = ["json", "stream", "rustls-tls"]`. The `stream` feature is required for SSE/chunked streaming responses from Anthropic and OpenAI. Do NOT use `native-tls` — `rustls-tls` avoids OpenSSL dependency hell on Windows. |
| serde | 1.x | Serialize/deserialize JSON | Standard. Use `features = ["derive"]`. |
| serde_json | 1.x | JSON parsing | Companion to serde. AI providers return JSON; SQLite settings stored as JSON. |
| rusqlite | 0.39.0 | SQLite database | Latest stable (2026-03-15). Use `features = ["bundled"]` to ship SQLite inside the binary — eliminates system SQLite version mismatches on macOS/Windows. FTS5 is included with bundled. |
| keyring | 3.6.3 | OS Keychain (macOS Keychain, Windows Credential Manager) | Latest stable. Version 4 is in RC. Stick with 3.6.3 for stability. Stores AI provider API keys and GitHub Copilot OAuth tokens securely. NEVER store keys in config files or localStorage. |
| async-trait | 0.1.x | Async methods on traits | Required for the `ProviderAdapter` trait with `async fn complete()`. The Rust compiler does not yet support `async fn` in traits stably in all contexts. |
### Development Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| `create-tauri-app` | Scaffold project | Run `npm create tauri-app@latest` and select React + TypeScript template. This sets up Vite + React 19 + TypeScript with correct `tauri.conf.json`. |
| `@tauri-apps/cli` | Build, dev, package Tauri app | Version 2.x. Run `npx tauri dev` for development, `npx tauri build` for distribution. |
| `@vitejs/plugin-react` | Babel-based React fast refresh | Default in create-tauri-app React template. Alternative: `@vitejs/plugin-react-swc` for faster cold starts (SWC instead of Babel). |
| ESLint + TypeScript ESLint | Linting | Use `@typescript-eslint/eslint-plugin` with strict mode. |
| Prettier | Code formatting | Standard formatter. |
| rust-analyzer | Rust IDE support | LSP for Rust in VS Code / Cursor. Essential for navigating Tauri's macro-heavy API. |
## Installation
# 1. Scaffold the project
# 2. Frontend: Tailwind v4 via Vite plugin
# 3. Frontend: shadcn/ui (Tailwind v4 mode)
# 4. Frontend: State management + async data
# 5. Frontend: Icons
# 6. Dev dependencies
# 7. Rust: Add crates to src-tauri/Cargo.toml (see version table above)
# tauri, tokio, reqwest, serde, serde_json, rusqlite, keyring, async-trait
# tauri-plugin-global-shortcut, tauri-plugin-clipboard-manager
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Zustand 5 | Jotai, Redux Toolkit | Jotai if you prefer atom-based granularity; Redux only for very large team projects with strict action tracing requirements. Zustand is simpler for a small desktop app. |
| TanStack Query | SWR | TanStack Query has richer features (mutations, optimistic updates, fine-grained invalidation). SWR is fine for simpler read-only cases. |
| shadcn/ui | Radix UI direct, MUI, Ant Design | shadcn/ui IS Radix UI — just pre-styled. MUI/Ant Design ship large runtime bundles that inflate binary size. Desktop app bundles matter less than web, but shadcn's copy-paste model gives full control of dark/light theming without overriding vendor styles. |
| rusqlite (bundled) | sqlx with sqlite feature | sqlx provides a more ergonomic async API, but adds complexity with compile-time query checking. rusqlite's sync API called from async Tauri commands via `tokio::task::spawn_blocking` is simpler and battle-tested. FTS5 works cleanly. |
| reqwest 0.13 | `tauri-plugin-http` | The official HTTP plugin is useful for simple fetch-from-frontend use cases. For AI provider calls that need streaming SSE and custom headers on the Rust side (where API keys live), raw reqwest is the right tool. |
| keyring 3.6.3 | `tauri-plugin-keyring` (community) | The community plugin wraps the same keyring crate. Using the crate directly in Rust gives more control; no plugin version lag. |
| Tailwind v4 | Tailwind v3 | v4 requires a config file rewrite if you migrate from v3. For a greenfield project, v4 is cleaner — no config file, native Vite plugin, CSS variables for theming. |
| rustls-tls | native-tls | `native-tls` on Windows requires OpenSSL or system TLS, adding build complexity. `rustls-tls` is pure Rust, builds cleanly on both macOS and Windows without extra system dependencies. |
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Electron | Binary size 100MB+, memory usage 500MB+. This project has a 200MB memory constraint and targets team distribution. | Tauri 2 |
| localStorage / Tauri `store` plugin for API keys | Frontend-accessible storage is not secure. API keys must survive app reinstall scoped to OS user, not app data directory. | `keyring` crate (OS Keychain) |
| `native-tls` feature on reqwest | Causes build failures on Windows without pre-installed OpenSSL. Unnecessary complexity for cross-platform CI/CD. | `rustls-tls` |
| Tauri `event` system for AI streaming tokens | Events are JSON-serialized strings with high overhead; not designed for high-throughput streaming. Real-time token streaming will feel laggy. | Tauri `Channel` API (`tauri::ipc::Channel`) for streaming AI tokens to frontend |
| `tauri::command` blocking sync functions for DB/HTTP | Blocks Tauri's thread pool. All I/O must be async or offloaded via `spawn_blocking`. | `async fn` commands + `spawn_blocking` for rusqlite calls |
| Redux | Heavyweight for this app's scale. Zustand handles all required state with a fraction of the boilerplate. | Zustand + TanStack Query |
| GitHub Copilot as a production provider | GitHub's ToS states Copilot API endpoints are "intended solely for use through GitHub Copilot's officially supported clients." Reverse-engineering or proxying the internal API violates ToS and risks account suspension. The Device Flow OAuth approach exists in open-source projects, but is unsupported and may break. | Make CopilotAdapter a clearly-labeled "experimental / use at your own risk" feature, or defer it entirely. |
## Stack Patterns by Variant
- Use Tauri `Channel` API, not events
- Rust side: `reqwest` with `stream` feature, iterate `response.bytes_stream()`, send chunks through `Channel`
- Frontend side: `listen()` on the channel, append tokens to React state
- rusqlite is synchronous; wrap all calls with `tokio::task::spawn_blocking`
- Hold the `rusqlite::Connection` in `tauri::State<Mutex<Connection>>`
- Define theme tokens in CSS `@layer base` using Tailwind v4's `@theme` directive
- Tailwind v4 has first-class dark mode via CSS `prefers-color-scheme` or a `data-theme` attribute
- shadcn/ui uses CSS variables that plug directly into Tailwind v4's `@theme`
- `OpenAIAdapter` with configurable `base_url` covers both; no code change needed
- Detect availability by attempting a lightweight `/models` ping before converting
- Ollama default: `http://localhost:11434/v1`; LM Studio default: `http://localhost:1234/v1`
## Version Compatibility
| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Tauri 2.10.3 | tauri-plugin-* 2.x | Plugin major version must match Tauri major version. Do not mix v1 plugins with Tauri 2. |
| rusqlite 0.39 | SQLite (bundled) 3.47+ | Bundled feature ships its own SQLite; system SQLite version irrelevant. FTS5 included. |
| reqwest 0.13 | tokio 1.x | reqwest 0.13 dropped support for tokio 0.x. Fully compatible with Tauri 2's embedded tokio. |
| keyring 3.6.3 | macOS 12+, Windows 10+ | Matches the project's platform targets exactly. macOS uses Security framework (Keychain); Windows uses Credential Manager. |
| Tailwind v4 | shadcn/ui (Feb 2025+) | shadcn/ui released Tailwind v4 support in February 2025. Use `npx shadcn@latest init` which auto-detects v4. |
| Zustand 5 | React 19 | Fully compatible. Zustand 5 requires React 18+. Use `use` prefix for stores as recommended by React Compiler conventions. |
| TanStack Query 5 | React 19 | v5 supports React 19. Use `@tanstack/react-query` not legacy `react-query`. |
| async-trait 0.1 | Rust stable (any recent) | Required until Rust stabilizes async-in-trait. Tauri 2 requires Rust 1.77.2+. |
## GitHub Copilot Adapter — Legal Risk Note
## Sources
- [Tauri GitHub Releases](https://github.com/tauri-apps/tauri/releases) — v2.10.3 confirmed current stable
- [tauri-plugin-global-shortcut on crates.io](https://crates.io/crates/tauri-plugin-global-shortcut/2.2.0) — v2.3.x series
- [tauri-plugin-clipboard-manager on docs.rs](https://docs.rs/crate/tauri-plugin-clipboard-manager/latest) — v2.3.2
- [rusqlite on docs.rs](https://docs.rs/crate/rusqlite/latest) — v0.39.0 (2026-03-15)
- [keyring on docs.rs](https://docs.rs/crate/keyring/latest) — v3.6.3 stable, v4.0.0-rc.3 in progress
- [reqwest on crates.io](https://crates.io/crates/reqwest) — v0.13.2 current stable
- [Tailwind CSS v4 blog post](https://tailwindcss.com/blog/tailwindcss-v4) — official announcement
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — Feb 2025 update
- [Zustand releases](https://github.com/pmndrs/zustand/releases) — v5.0.x, React 19 compatible
- [TanStack Query npm](https://www.npmjs.com/package/@tanstack/react-query) — v5.x
- [Tauri Calling Frontend docs](https://v2.tauri.app/develop/calling-frontend/) — Channel API for streaming
- [GitHub Copilot ToS](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features) — API usage restrictions
- [create-tauri-app React 19 + Vite 6 compatibility](https://github.com/dannysmith/tauri-template) — confirmed working stack
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

**言語:** すべての応答は日本語で行うこと。GSDワークフロー（バナー、チェックポイント、進捗レポートなど）の出力も含む。
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
