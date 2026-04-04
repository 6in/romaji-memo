# Project Research Summary

**Project:** Romaji Memo (romaji-editor)
**Domain:** AI-powered romaji-to-Japanese/English text conversion — Tauri 2 floating desktop utility
**Researched:** 2026-04-05
**Confidence:** HIGH

## Executive Summary

Romaji Memo is a floating desktop utility that accepts space-free romaji input and uses an LLM to produce correctly segmented, stylistically varied Japanese output (or English translation). The product is best built as a Tauri 2 desktop app with a React 19 / TypeScript frontend and a Rust backend that handles all AI HTTP calls, SQLite persistence, and OS Keychain secret storage. This architecture keeps API keys off the frontend entirely, meets the 200MB memory target that rules out Electron, and ships cross-platform (macOS 12+ / Windows 10+) from a single codebase. The established pattern for this class of app — a strategy-based provider abstraction, a Mutex-wrapped SQLite connection, and a single typed IPC boundary — is well documented and reduces architectural risk.

The core technical differentiator is space-free continuous romaji boundary inference (e.g. `korehadouda` → 「これはどうだ」), which must be validated in Phase 1. No competing tool — Microsoft IME, Superwhisper, BoltAI — does this. The eight built-in dialect/register styles (Osaka-ben, gyaru, bushi, etc.) and AI-generated "intent" annotations are secondary differentiators that add trust and shareability. The MVP is intentionally narrow: conversion core + two providers + history + always-on-top + OS Keychain. Everything else is additive.

The three highest risks are all Phase 1 concerns: (1) AI streaming must be wired through Tauri's Channel API from day one or retrofitting costs 1–2 days later; (2) the `decorations: false` + `transparent: true` window combination has confirmed regressions in packaged Tauri 2 builds on both platforms and must be tested against built artifacts, not just `tauri dev`; (3) OS Keychain access must be serialized behind a Mutex from the start because parallel reads from the `keyring` crate can deadlock on macOS. Treating these as week-one integration tests rather than post-MVP polish eliminates the bulk of identified risk.

## Key Findings

### Recommended Stack

The frontend is React 19 + TypeScript 5 built by Vite 6, styled with Tailwind v4 (Vite plugin, no config file), and componentized with shadcn/ui (Tailwind v4 branch). State is split: Zustand 5 for UI-local state (current input, loading flags, draft buffer, window mode) and TanStack Query 5 for async IPC calls that return history and provider lists. The backend is Rust stable (1.77.2+) using Tauri 2.10.3 with official plugins for global shortcut (`tauri-plugin-global-shortcut 2.3.x`) and clipboard (`tauri-plugin-clipboard-manager 2.3.2`). AI calls use `reqwest 0.13` with `rustls-tls` (never `native-tls`) and the `stream` feature for SSE. SQLite uses `rusqlite 0.39` with `features = ["bundled"]` to embed SQLite and include FTS5. Secrets use `keyring 3.6.3` targeting macOS Keychain and Windows Credential Manager.

**Core technologies:**
- **Tauri 2.10.3**: Desktop shell, IPC bridge, global shortcut, clipboard, transparent floating window — dramatically smaller binary than Electron
- **Rust (stable)**: All AI HTTP, SQLite, and Keychain I/O run here; API keys never touch the frontend
- **React 19 + TypeScript 5 + Vite 6**: Official Tauri 2 recommended frontend stack; fast HMR and native ESM
- **Zustand 5**: Sliced per concern (conversion, history, draft, settings) to avoid monolithic re-renders
- **rusqlite 0.39 (bundled)**: Embedded SQLite with FTS5 for full-text history search; no system SQLite dependency
- **reqwest 0.13 (rustls-tls + stream)**: Cross-platform HTTP for AI SSE streaming; pure Rust TLS avoids OpenSSL on Windows
- **keyring 3.6.3**: OS Keychain on macOS and Windows Credential Manager; API keys never on disk or in SQLite

**Avoid:** Electron (too large), localStorage/SQLite for API keys (insecure), Tauri event system for token streaming (high overhead), Redux (too heavy), GitHub Copilot adapter in MVP (ToS ambiguity).

### Expected Features

**Must have (table stakes — Phase 1):**
- Romaji input → AI-converted Japanese/English output — core product promise
- Space-free continuous romaji boundary inference — primary technical differentiator
- Style preset selection (8 built-in: Osaka-ben, gyaru, bushi, business, etc.) — needed to validate style outputs
- One-click copy to clipboard — without this the floating utility pattern has no usable output
- AI "intent" + typo annotation display — trust signal; surfaces what the LLM understood
- Persistent conversion history (SQLite) — needed to iterate on outputs across sessions
- Always-on-top toggle — without this the floating window pattern breaks
- API key storage via OS Keychain — non-negotiable for team distribution security
- Dark/light theme (default dark-green) — native desktop expectation

**Should have (differentiators — Phase 2):**
- Global hotkey (Cmd/Ctrl+Shift+R) — reduces friction for the floating utility workflow
- History search with FTS5 + style filter + pinned items — needed once history grows
- Draft buffer (multi-item stacking) — eliminates round-trips to the destination app for multi-paragraph work
- Custom style CRUD — personalisation and retention
- Window size/position persistence — native desktop expectation
- GitHub Copilot adapter (Device Flow OAuth) — leverage existing Copilot subscriptions; high complexity, labeled experimental

**Defer (v2+):**
- Long-document accumulation mode with .md/.txt export
- Clipboard watch mode (auto-import clipboard text)
- Mini-mode (Superwhisper-style minimal view)
- Provider management CRUD UI (Phase 1 can hardcode provider configs)

**Never build:** Auto-paste (requires Accessibility permissions, wrong-window risk), cloud history sync (transforms utility into SaaS), screenshot OCR (doubles scope), real-time per-keystroke streaming conversion (LLM latency makes this impractical).

### Architecture Approach

The architecture is a clean two-layer Tauri 2 app: a React WebView frontend that communicates exclusively through typed `invoke()` wrappers in `src/lib/tauri.ts`, and a Rust backend that owns all durable state (SQLite via `AppState { db: Mutex<Connection>, providers: RwLock<HashMap> }`) and all external I/O (AI HTTP, Keychain). The Provider Service implements a Strategy pattern (`ProviderAdapter` trait with `async fn complete()`) so AnthropicAdapter, OpenAIAdapter (also covers Ollama/LM Studio/OpenRouter), and CopilotAdapter are interchangeable without touching the command layer. Prompt templates live in Rust, not TypeScript, so system prompts cannot be inspected via browser devtools.

**Major components:**
1. **Command Layer (Rust)**: Thin `#[tauri::command]` handlers that orchestrate Provider Service, DB Service, and Window/Keychain — one file per domain (`convert.rs`, `history.rs`, `providers.rs`, `window.rs`)
2. **Provider Service (Rust)**: `Arc<dyn ProviderAdapter>` map; all AI HTTP via `reqwest`; streaming tokens via Tauri Channel API (not events)
3. **DB Service (Rust)**: Migration-first `db/` module; FTS5 virtual table with three triggers (INSERT/UPDATE/DELETE) created in the initial migration transaction
4. **Keychain (Rust)**: Single `Mutex<()>`-serialized `keyring` access; account identifier format `"romaji-memo/{provider_id}"`
5. **Zustand Stores (Frontend)**: Four slices — `conversionStore`, `historyStore`, `draftStore`, `settingsStore` — each subscribed to independently
6. **tauri.ts (Frontend)**: Single IPC choke point; all `invoke()` calls are typed wrappers here; components never import from `@tauri-apps/api` directly

### Critical Pitfalls

1. **AI streaming buffered if using commands instead of channels** — Use `tauri::ipc::Channel` from Phase 1. Commands are request-response; the full body buffers before the frontend sees anything. Retrofitting costs 1–2 days. Wire channels on day one.

2. **Transparent/undecorated window regresses in packaged builds** — Known Tauri 2 issues (#12042, #13415, #14822): `decorations: false` + `transparent: true` renders correctly in `tauri dev` but reverts to opaque in the `.app` / `.exe` on macOS. Use a custom drag handle (`data-tauri-drag-region`), skip `tauri-plugin-window-state` (hangs on macOS with `decorations: false`), and implement manual position persistence in SQLite. Test the packaged binary before Phase 1 sign-off.

3. **FTS5 virtual table stale or corrupt without all three triggers** — `conversions_fts` with `content='conversions'` requires explicit INSERT, UPDATE, and DELETE triggers. Missing the DELETE trigger silently diverges the index (~10% corruption rate per SQLite forum). Create all three in the initial migration transaction and add an integration test immediately.

4. **OS Keychain deadlocks under parallel access** — The `keyring` crate is not safe to call from multiple async tasks simultaneously on macOS. Serialize all Keychain reads/writes behind a `Mutex<()>` in `keychain.rs`. Always use non-empty account strings (`"romaji-memo/{provider_id}"`).

5. **Always-on-top fails on macOS full-screen Spaces** — `set_always_on_top` does not override Space-level z-ordering. Set `activation_policy: Accessory` and `visible_on_all_workspaces(true)` intentionally. Accept that the app will not appear in the Dock. Validate with an explicit macOS full-screen test before Phase 1 ships.

6. **Mid-stream error not caught from Anthropic/OpenAI SSE** — These APIs return HTTP 200 then send `{"error": {...}}` as an SSE event mid-stream. Checking only HTTP status misses this. Parse every SSE chunk JSON for an `"error"` key before processing as content. Add a mock-server test that sends a mid-stream error.

7. **Global shortcut double-fires or panics on macOS** — `CommandOrControl` combinations fire twice (Tauri issue #10025). Add a 100ms debounce in the Rust handler. Register shortcuts inside the `setup` closure after all plugins initialize. This is a Phase 2 concern (hotkey is Phase 2).

## Implications for Roadmap

Based on research, the dependency graph and pitfall criticality suggest a three-phase structure, with Phase 1 representing the full end-to-end conversion loop and all cross-cutting infrastructure, Phase 2 adding UX polish and the richer feature set, and Phase 3 covering power-user modes.

### Phase 1: Core Conversion Loop and Infrastructure Foundation

**Rationale:** Every subsequent feature depends on the Rust infrastructure (DB, Keychain, Provider trait, Channel streaming) being correct. The streaming architecture and window chrome are the highest-cost items to retrofit, so they must be established here even though they feel like "polish." The space-free boundary inference must be validated early — it is the product's reason to exist.

**Delivers:** A working floating utility: romaji in, Japanese/English out, persistent history, two providers (Anthropic + OpenAI-compatible/Ollama), always-on-top window, OS Keychain key storage. Team can install and use it.

**Addresses (from FEATURES.md P1):** Core conversion, space-free boundary inference, style preset selection (8 built-in), one-click copy, AI intent/typo annotation, persistent history, always-on-top toggle, OS Keychain storage, dark/light theme.

**Avoids (from PITFALLS.md):** AI streaming via channels (not commands), FTS5 triggers in initial migration, Keychain Mutex serialization, transparent window in packaged build, mid-stream SSE error handling, Zustand error rollback contract, CSP enforcement (no `fetch()` from React).

**Build order within phase:** scaffold + Tauri config → DB layer + FTS5 schema → Keychain module → ProviderAdapter trait + AnthropicAdapter → OpenAIAdapter → convert command + streaming channel + basic Converter UI → History DB commands + History UI → always-on-top + window chrome (custom drag handle, manual position persistence).

### Phase 2: UX Polish and Extended Providers

**Rationale:** Once the conversion loop is validated by the team, frictions become clear. Global hotkey, history search, and draft buffer all reduce the number of manual steps per conversion. The GitHub Copilot adapter requires Device Flow OAuth (a distinct async multi-step flow) and should slot in after the provider abstraction has been proven stable.

**Delivers:** A smooth daily-driver: invoke from anywhere, search and pin history, compose multi-paragraph outputs without losing prior work, connect Copilot subscription, customise styles.

**Addresses (from FEATURES.md P2):** Global hotkey (Cmd/Ctrl+Shift+R), history search with FTS5 + style filter, pinned history items, draft buffer, custom style CRUD, window size/position persistence, GitHub Copilot adapter (experimental, behind UI warning).

**Uses (from STACK.md):** `tauri-plugin-global-shortcut 2.3.x`, FTS5 MATCH queries against `conversions_fts`, `custom_styles` table CRUD.

**Avoids (from PITFALLS.md):** Global shortcut double-fire (100ms debounce), Copilot Device Flow blocking UI (two-step command: `start_copilot_auth` → async polling with Tauri events).

**Research flag:** Copilot Device Flow OAuth integration has ToS ambiguity and undocumented endpoint risk. Label as experimental in UI. This sub-feature may need a dedicated research spike before implementation.

### Phase 3: Power-User Modes

**Rationale:** Long-document accumulation and clipboard watch mode serve a narrower use case and depend on the draft buffer (Phase 2) being stable. Mini-mode is UX refinement that makes most sense after the full layout has settled through real use.

**Delivers:** Writing-tool capability: paragraph-by-paragraph conversion with export to .md/.txt, auto-import from clipboard, Superwhisper-style minimal view.

**Addresses (from FEATURES.md P3):** Long-document mode with file export (Tauri `fs`), clipboard watch mode, mini-mode (resize + hide panels), provider management CRUD UI, history limit configuration.

**Research flag:** File system write via Tauri `fs` plugin requires capability declarations in `tauri.conf.json`. Verify scope permissions before implementation. Clipboard watch mode polling behaviour on Windows needs validation.

### Phase Ordering Rationale

- Infrastructure before features: DB migrations, Keychain, and the Provider trait are load-bearing. No feature can work correctly without them, and retrofitting them after UI is built is expensive.
- Pitfall-first: The two highest-recovery-cost pitfalls (streaming architecture, window chrome) are addressed in Phase 1, not deferred. This is the single most important finding from the pitfall research.
- Dependency graph respected: Draft buffer (Phase 2) must precede long-document mode (Phase 3). Global hotkey (Phase 2) ships after the window management foundation (Phase 1). Copilot adapter (Phase 2) ships after the provider trait is proven stable (Phase 1).
- Security non-negotiable from day one: Keychain is Phase 1 because team distribution requires it. Deferring it means shipping with insecure key storage even temporarily, which is explicitly called out as a never-acceptable shortcut in the pitfall research.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Copilot adapter):** GitHub Copilot Device Flow is undocumented, ToS-ambiguous, and subject to silent breakage. Needs a targeted spike: confirm the OAuth flow still works, confirm endpoint stability, and draft the UI warning copy before implementation.
- **Phase 3 (file export):** Tauri `fs` capability scoping has changed between Tauri 2 minor versions. Verify the exact `tauri.conf.json` permission declarations needed at the time of implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1:** All patterns (Channel streaming, rusqlite AppState, Keychain, typed IPC wrappers) are documented in official Tauri 2 docs and verified in the stack and architecture research. No additional research needed.
- **Phase 2 (excluding Copilot):** FTS5 queries, Zustand slices, and custom CRUD patterns are fully standard. No additional research needed.
- **Phase 3 (mini-mode, clipboard watch):** Standard Tauri window resize and clipboard polling patterns; existing research covers these adequately.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against crates.io, docs.rs, npm, and official Tauri GitHub releases as of 2026-04-05. Version compatibility matrix explicitly checked. |
| Features | HIGH | Project spec is detailed and authoritative. Competitor analysis (Superwhisper, BoltAI, Elephas, Paste, Microsoft IME) grounds the table-stakes and differentiator calls. |
| Architecture | HIGH | Patterns verified against official Tauri 2 docs. Design spec (`docs/pre/romaji-memo-design.md`) is the authoritative source and was treated as HIGH confidence input. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls backed by specific Tauri GitHub issue numbers (#9439, #10025, #12042, #13415, #14822, #14822) and the SQLite forum. Some platform-specific behaviours (Windows Credential Manager edge cases) have MEDIUM confidence. |

**Overall confidence:** HIGH

### Gaps to Address

- **Copilot Device Flow endpoint stability:** The `api.githubcopilot.com/chat/completions` endpoint is not a documented public API. It may change or be blocked. Validate the endpoint and OAuth flow against the current GitHub API before beginning Phase 2 Copilot implementation. If it has been blocked, remove `CopilotAdapter` from Phase 2 scope entirely and mark as deferred.

- **LLM prompt design for space-free segmentation:** The core differentiator depends entirely on the system prompt's ability to infer word boundaries in continuous romaji. The research identifies this as the primary technical moat but does not validate specific prompt strategies. This needs a rapid prototyping spike in Phase 1 before building the full conversion UI.

- **Windows build and packaging CI:** Several critical pitfalls (transparent window, Keychain Credential Manager, CSP behaviour) are platform-specific to Windows and can only be confirmed in a real Windows build. At minimum one Windows 10+ machine must be used for Phase 1 acceptance testing. CI/CD for both platforms should be established early.

- **keyring v4 migration timing:** keyring v4.0.0-rc.3 is in progress. The research recommends staying on 3.6.3 for stability. Monitor for v4 stable release during Phase 2; evaluate migration cost before it becomes a forced upgrade.

## Sources

### Primary (HIGH confidence)

- [Tauri GitHub Releases](https://github.com/tauri-apps/tauri/releases) — v2.10.3 current stable confirmed
- [Tauri 2 Architecture official docs](https://v2.tauri.app/concept/architecture/) — IPC, State, Channel API patterns
- [Tauri 2 Calling Frontend docs](https://v2.tauri.app/develop/calling-frontend/) — Channel API for streaming
- [rusqlite on docs.rs](https://docs.rs/crate/rusqlite/latest) — v0.39.0 bundled feature, FTS5
- [keyring on docs.rs](https://docs.rs/crate/keyring/latest) — v3.6.3 stable
- [reqwest on crates.io](https://crates.io/crates/reqwest) — v0.13.2 current stable
- [Tailwind CSS v4 official announcement](https://tailwindcss.com/blog/tailwindcss-v4) — Vite plugin, no config file
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — Feb 2025 compatibility update
- [tauri-plugin-global-shortcut on crates.io](https://crates.io/crates/tauri-plugin-global-shortcut/2.2.0) — v2.3.x
- Design spec: `docs/pre/romaji-memo-design.md` — authoritative project requirements

### Secondary (MEDIUM confidence)

- Tauri GitHub Issues: [#9439](https://github.com/tauri-apps/tauri/issues/9439), [#10025](https://github.com/tauri-apps/tauri/issues/10025), [#12042](https://github.com/tauri-apps/tauri/issues/12042), [#13415](https://github.com/tauri-apps/tauri/issues/13415), [#14822](https://github.com/tauri-apps/tauri/issues/14822) — platform-specific window behaviour pitfalls
- [SQLite Forum: FTS5 trigger corruption](https://sqlite.org/forum/info/da59bf102d7a7951740bd01c4942b1119512a82bfa1b11d4f762056c8eb7fc4e) — trigger design requirements
- [Anthropic Errors / SSE mid-stream docs](https://docs.anthropic.com/en/api/errors) — mid-stream error format
- [OpenAI Community: mid-stream error handling](https://community.openai.com/t/best-practices-for-handling-mid-stream-errors-responses-api/1370883)
- Superwhisper, BoltAI, Elephas, Paste feature analysis — competitor feature benchmarking
- [GitHub Copilot ToS](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features) — API usage restriction analysis

### Tertiary (LOW confidence — needs validation)

- GitHub Copilot Device Flow OAuth approach: sourced from open-source third-party projects, not official GitHub documentation. Treat as unvalidated until confirmed working against current endpoints.
- keyring crate thread safety on Windows: documented in community issues but not in official crate docs; warrants explicit testing.

---
*Research completed: 2026-04-05*
*Ready for roadmap: yes*
