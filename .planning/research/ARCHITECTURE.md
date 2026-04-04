# Architecture Research

**Domain:** Tauri 2 desktop app with AI provider integration, SQLite storage, OS Keychain, floating window
**Researched:** 2026-04-05
**Confidence:** HIGH (design spec is detailed; patterns verified against Tauri 2 official docs)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (WebView / React)                   │
│                                                                   │
│  ┌──────────────┐  ┌────────────┐  ┌────────────┐  ┌─────────┐  │
│  │  Converter   │  │  History   │  │DraftBuffer │  │Settings │  │
│  │  (main UI)   │  │  (drawer)  │  │            │  │         │  │
│  └──────┬───────┘  └─────┬──────┘  └─────┬──────┘  └────┬────┘  │
│         │                │               │               │       │
│  ┌──────┴───────────────────────────────────────────┐    │       │
│  │              Zustand Store (client state)         │    │       │
│  │  conversionState | historyState | settingsState  │    │       │
│  └──────────────────────────┬───────────────────────┘    │       │
│                             │                             │       │
│  ┌──────────────────────────┴─────────────────────────────┘       │
│  │                  invoke() — Tauri IPC Bridge                   │
└──┴────────────────────────────────────────────────────────────────┘
                              │ (async IPC)
┌─────────────────────────────┴──────────────────────────────────────┐
│                    BACKEND (Rust / Tauri Core)                      │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                     Command Layer                            │    │
│  │  convert()  get_history()  save_provider()  toggle_pin()   │    │
│  │  toggle_always_on_top()    test_provider()  delete_*()      │    │
│  └──────┬────────────────┬──────────────────┬──────────────────┘    │
│         │                │                  │                        │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌───────┴──────┐                │
│  │  Provider   │  │  Database   │  │   Window /   │                │
│  │  Service    │  │  Service    │  │   Keychain   │                │
│  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘                │
│         │                │                 │                        │
│  ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴───────┐                │
│  │AnthropicAd. │  │  rusqlite   │  │  keyring     │                │
│  │OpenAIAdapter│  │  SQLite DB  │  │  OS Keychain │                │
│  │CopilotAdapt.│  │  (FTS5)     │  │              │                │
│  └──────┬──────┘  └─────────────┘  └──────────────┘                │
└─────────┼──────────────────────────────────────────────────────────┘
          │ (HTTP/HTTPS)
┌─────────┴────────────────────────────────────────┐
│              External AI Providers                │
│  Anthropic API | OpenAI API | Ollama (localhost)  │
│  OpenRouter | LM Studio (localhost) | GitHub API  │
└──────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Layer | Responsibility | Communicates With |
|-----------|-------|----------------|-------------------|
| Converter | Frontend | Primary UI: romaji input, style selector, result display, copy button | Zustand store, invoke() |
| History | Frontend | Drawer showing past conversions; search, filter, pin, reuse | Zustand store, invoke() |
| DraftBuffer | Frontend | Multi-item stash of converted texts; reorder, bulk copy | Zustand store (local only) |
| Settings | Frontend | Provider management UI; add/edit/delete providers and API keys | Zustand store, invoke() |
| StyleSelector | Frontend | Built-in + custom style picker | Zustand store |
| Zustand Store | Frontend | Client-side state: current conversion, history cache, providers list, window state | Components, hooks |
| invoke() wrappers (tauri.ts) | Frontend | Typed wrappers over Tauri IPC; sole point of contact with Rust | All hooks/components that need data |
| Command Layer | Backend | `#[tauri::command]` handlers; entry points from frontend | Provider Service, DB Service, Window/Keychain |
| Provider Service | Backend | Routes completion requests to the correct adapter; owns `Arc<dyn ProviderAdapter>` map | ProviderAdapter impls, Keychain |
| AnthropicAdapter | Backend | HTTP calls to Anthropic API (custom format) | Anthropic API |
| OpenAIAdapter | Backend | HTTP calls to any OpenAI-compatible endpoint (Ollama, OpenRouter, LM Studio, OpenAI) | Various endpoints |
| CopilotAdapter | Backend | Device Flow OAuth; token refresh; GitHub Copilot completions endpoint | GitHub auth + API |
| DB Service | Backend | Migration, CRUD, FTS5 search for `conversions`, `custom_styles`, `settings` tables | rusqlite / SQLite |
| Keychain | Backend | Store and retrieve API keys via OS Keychain only (`keyring` crate) | macOS Keychain / Windows Credential Manager |
| Window Manager | Backend | Always-on-top toggle, mini-mode, size/position persistence, global shortcut registration | Tauri window API, `tauri-plugin-global-shortcut` |

## Recommended Project Structure

```
romaji-memo/
├── src-tauri/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs              # App bootstrap, plugin registration, AppState init
│       ├── state.rs             # AppState struct: Mutex<Connection>, provider map
│       ├── commands/
│       │   ├── mod.rs           # Re-exports all commands for registration
│       │   ├── convert.rs       # convert() — routes to provider, saves history
│       │   ├── history.rs       # get_history(), toggle_pin(), delete_conversion()
│       │   ├── settings.rs      # get_settings(), save_settings()
│       │   ├── providers.rs     # list_providers(), save_provider(), test_provider()
│       │   └── window.rs        # toggle_always_on_top(), save_window_state()
│       ├── providers/
│       │   ├── mod.rs           # ProviderAdapter trait, CompletionRequest/Response
│       │   ├── anthropic.rs     # AnthropicAdapter
│       │   ├── openai.rs        # OpenAIAdapter (OpenAI/Ollama/OpenRouter/LM Studio)
│       │   └── copilot.rs       # CopilotAdapter (Device Flow OAuth)
│       ├── db/
│       │   ├── mod.rs           # connection setup, migration runner
│       │   ├── migrations.rs    # SQL migration strings keyed by version
│       │   ├── conversions.rs   # insert, query, pin, delete for conversions table
│       │   ├── styles.rs        # CRUD for custom_styles table
│       │   └── settings.rs      # get/set for settings table
│       └── keychain.rs          # get_api_key(), set_api_key(), delete_api_key()
│
├── src/
│   ├── main.tsx
│   ├── App.tsx                  # Theme provider, router (main/settings/mini)
│   ├── components/
│   │   ├── Converter.tsx        # Romaji input, style selector, convert button, result
│   │   ├── History.tsx          # Drawer: history list, search, filter, pin controls
│   │   ├── DraftBuffer.tsx      # Stacked drafts; drag-to-reorder, bulk copy
│   │   ├── StyleSelector.tsx    # Built-in + custom style chips
│   │   └── Settings.tsx         # Provider cards; API key entry → Keychain
│   ├── hooks/
│   │   ├── useConvert.ts        # Calls invoke('convert'), updates store
│   │   ├── useHistory.ts        # Calls invoke('get_history'), manages pagination
│   │   └── useProviders.ts      # Calls invoke('list_providers', 'save_provider')
│   ├── store/
│   │   ├── conversionStore.ts   # Current input, result, loading, error
│   │   ├── historyStore.ts      # Cached history page, search state
│   │   ├── draftStore.ts        # Draft buffer items (in-memory only)
│   │   └── settingsStore.ts     # Active provider, theme, window flags
│   └── lib/
│       ├── tauri.ts             # Typed invoke() wrappers — all IPC goes here
│       └── prompts.ts           # Style definitions (mirrors DB; used for display)
│
├── tauri.conf.json
└── package.json
```

### Structure Rationale

- **commands/:** One file per domain (convert, history, providers, window). Keeps command handlers thin — they orchestrate, they don't implement.
- **providers/:** Isolated from DB and Keychain. The trait is the only shared surface. Swapping or adding a provider touches only this directory.
- **db/:** Migration-first design. All SQL lives here; command handlers never write raw SQL.
- **store/:** One Zustand slice per concern. Avoids a monolithic store that triggers global re-renders.
- **lib/tauri.ts:** Single choke point for IPC. If Tauri API changes, only this file needs updating; components never call `invoke` directly.

## Architectural Patterns

### Pattern 1: AppState with Mutex-wrapped DB Connection

**What:** The Rust `AppState` struct holds the SQLite connection behind a `Mutex`, registered with Tauri's managed state system. Commands receive `State<AppState>` as an argument.

**When to use:** Any command needing DB access. The pattern is standard for Tauri 2 rusqlite integration.

**Trade-offs:** Mutex serializes DB writes — acceptable for a single-user desktop app. For high-frequency reads, consider `Arc<RwLock<Connection>>` or a connection pool (overkill here).

**Example:**
```rust
// state.rs
pub struct AppState {
    pub db: Mutex<Connection>,
    pub providers: RwLock<HashMap<String, Arc<dyn ProviderAdapter>>>,
}

// commands/convert.rs
#[tauri::command]
pub async fn convert(
    state: tauri::State<'_, AppState>,
    input: String,
    style_id: String,
    provider_id: String,
) -> Result<ConvertResult, String> {
    let provider = {
        let providers = state.providers.read().unwrap();
        providers.get(&provider_id).cloned()
    };
    // ... call provider, then lock DB to save
}
```

### Pattern 2: ProviderAdapter Trait (Strategy Pattern)

**What:** All AI provider implementations satisfy a single async Rust trait. The command layer holds a `HashMap<String, Arc<dyn ProviderAdapter + Send + Sync>>` and dispatches by `provider_id`.

**When to use:** Any time a new provider needs adding, or when the active provider changes at runtime.

**Trade-offs:** `Arc<dyn Trait>` has a small vtable overhead — irrelevant for network-bound AI calls. The pattern makes provider-specific code completely invisible to callers.

**Example:**
```rust
// providers/mod.rs
#[async_trait]
pub trait ProviderAdapter: Send + Sync {
    async fn complete(&self, req: CompletionRequest) -> Result<CompletionResponse, ProviderError>;
    fn name(&self) -> &str;
    fn supports_streaming(&self) -> bool;
}

// Registration in main.rs setup()
let mut providers: HashMap<String, Arc<dyn ProviderAdapter>> = HashMap::new();
providers.insert("anthropic".into(), Arc::new(AnthropicAdapter::new(key)));
providers.insert("ollama-local".into(), Arc::new(OpenAIAdapter::new(config)));
```

### Pattern 3: Typed invoke() Wrappers (Frontend IPC Boundary)

**What:** All `invoke()` calls live in `src/lib/tauri.ts`. Components and hooks never import from `@tauri-apps/api` directly. Each wrapper is a fully typed async function.

**When to use:** Every frontend-to-backend call.

**Trade-offs:** Small indirection cost; pays back immediately when Tauri API changes or mocking for tests.

**Example:**
```typescript
// lib/tauri.ts
import { invoke } from '@tauri-apps/api/core';

export async function convert(
  input: string,
  styleId: string,
  providerId: string
): Promise<ConvertResult> {
  return invoke<ConvertResult>('convert', { input, styleId, providerId });
}

export async function getHistory(
  limit: number,
  offset: number,
  styleFilter?: string,
  query?: string
): Promise<ConversionRecord[]> {
  return invoke<ConversionRecord[]>('get_history', { limit, offset, styleFilter, query });
}
```

### Pattern 4: Keychain as the Only Secret Store

**What:** API keys are never written to `tauri.conf.json`, `localStorage`, the SQLite DB, or in-memory plain strings beyond the duration of a single call. The `keyring` crate maps `(service="romaji-memo", username=provider_id)` → secret.

**When to use:** Every read/write of an API key.

**Trade-offs:** Keychain prompts OS permission dialog on first access (macOS). On Windows, Credential Manager is transparent. Acceptable cost for team distribution security.

**Example:**
```rust
// keychain.rs
use keyring::Entry;

pub fn get_api_key(provider_id: &str) -> Result<String, keyring::Error> {
    Entry::new("romaji-memo", provider_id)?.get_password()
}

pub fn set_api_key(provider_id: &str, key: &str) -> Result<(), keyring::Error> {
    Entry::new("romaji-memo", provider_id)?.set_password(key)
}
```

## Data Flow

### Conversion Request Flow

```
User types romaji → presses Convert
        ↓
Converter.tsx (React)
        ↓ calls useConvert hook
conversionStore: set loading=true
        ↓
tauri.ts: invoke('convert', { input, styleId, providerId })
        ↓ async IPC crossing WebView boundary
commands/convert.rs: convert()
        ↓
  1. Read provider from AppState.providers map
  2. Build CompletionRequest with system prompt + style
  3. Call provider.complete(req).await → CompletionResponse
  4. Lock AppState.db → insert into conversions table
  5. Return ConvertResult { output, intent, typo }
        ↓ IPC response
tauri.ts resolves Promise<ConvertResult>
        ↓
conversionStore: set result, loading=false
        ↓
Converter.tsx re-renders with result + Copy button
```

### API Key Write Flow (Settings)

```
User enters API key in Settings.tsx
        ↓
invoke('save_provider', { config, apiKey })
        ↓
commands/providers.rs: save_provider()
        ↓
  1. keychain::set_api_key(provider_id, api_key)   ← OS Keychain
  2. Serialize ProviderConfig WITHOUT key → settings table
  3. Re-initialize adapter in AppState.providers map
        ↓
Return Ok(())  →  settingsStore refresh
```

### History Search Flow

```
User types in History search box
        ↓ debounced (300ms)
historyStore: set searchQuery
        ↓
useHistory hook: invoke('get_history', { query, styleFilter, ... })
        ↓
commands/history.rs: get_history()
        ↓
db/conversions.rs: FTS5 query on conversions_fts
        ↓
Return Vec<ConversionRecord>
        ↓
historyStore: replace history list → History.tsx re-renders
```

### Window Management Flow

```
Global hotkey (Cmd/Ctrl+Shift+R) registered at app startup
        ↓
tauri-plugin-global-shortcut fires callback in Rust
        ↓
window.show() + window.set_focus()
        ↓
(Optional: restore last known position from settings table)

User clicks Always-on-Top toggle
        ↓
invoke('toggle_always_on_top')
        ↓
commands/window.rs: window.set_always_on_top(!current_state)
        ↓ also persist to settings table
settingsStore: update alwaysOnTop flag
```

### State Management

```
Zustand Stores (client-side only)
    ↓ (read)
React Components ←→ Custom Hooks
                         ↓ (write via invoke)
                    Rust Backend (authoritative for all persistent state)
                         ↓
                    SQLite + OS Keychain
```

**Key invariant:** Rust is the single source of truth for all durable state. Zustand caches the last-fetched values and manages UI-only ephemeral state (loading flags, draft buffer, current input).

## Suggested Build Order (Dependencies)

The following order respects hard dependencies between components:

1. **Project scaffold + Tauri configuration** — window settings, plugin registration, AppState skeleton. Everything else requires this foundation.
2. **DB layer (db/ module)** — migration runner, schema creation, CRUD functions for all three tables. No command can work without it.
3. **Keychain module** — needed before any provider can load its key at runtime.
4. **ProviderAdapter trait + AnthropicAdapter** — defines the interface all other adapters follow. Anthropic is simplest (no OAuth).
5. **OpenAIAdapter** — reuses trait from step 4; unlocks Ollama/local testing without needing real API keys.
6. **commands/convert.rs + basic Converter UI** — first end-to-end path: input → AI → result → copy. This is the MVP core.
7. **History DB commands + History UI** — depends on conversions table (step 2) and conversion flow (step 6).
8. **CopilotAdapter (Device Flow OAuth)** — more complex; isolated behind the trait, so it can slot in without touching other code.
9. **Provider management commands + Settings UI** — depends on Keychain (step 3) and all adapters (steps 4-5, 8).
10. **Global shortcut + window management** — isolated plugin; no data dependencies. Can be added any time after scaffold.
11. **Custom styles, draft buffer, clipboard monitor** — pure feature additions on top of stable infrastructure.

## Anti-Patterns

### Anti-Pattern 1: API Keys in SQLite or Settings Files

**What people do:** Store the raw API key string in the `settings` table or in `tauri.conf.json` / a JSON settings file for convenience.
**Why it's wrong:** SQLite databases and config files are readable by any process with filesystem access. On macOS, the app sandbox does not protect files from the owning user. On Windows, files in AppData are not encrypted.
**Do this instead:** Write only the service identifier (`"anthropic"`, `"ollama-local"`) to the settings table. Store the actual secret exclusively via `keyring::Entry::set_password()`. On first launch with no key, prompt in Settings UI.

### Anti-Pattern 2: Direct `invoke()` Calls Scattered Across Components

**What people do:** Call `invoke('convert', {...})` directly inside a React component's click handler or `useEffect`.
**Why it's wrong:** IPC calls become impossible to mock, type changes require hunting across the codebase, and error handling is inconsistent.
**Do this instead:** All IPC passes through `src/lib/tauri.ts` typed wrappers. Components use custom hooks (`useConvert`, `useHistory`) that call the wrappers.

### Anti-Pattern 3: Blocking Mutex in Async Commands

**What people do:** Lock `state.db.lock().unwrap()` and run a long query while holding the lock across an `await` point.
**Why it's wrong:** In async Tauri commands running on tokio, holding a `std::sync::Mutex` across `.await` can cause deadlocks because the executor may park the future on one thread and attempt to resume on another.
**Do this instead:** Keep the Mutex lock scope minimal — lock, clone/extract the data needed, release, then proceed. For the SQLite case, all DB operations in this app are fast (< 1ms) so hold-and-run is safe as long as no `.await` appears inside the lock scope.

### Anti-Pattern 4: Monolithic Zustand Store

**What people do:** Create a single `useAppStore` with all application state — conversion, history, providers, UI flags — in one flat object.
**Why it's wrong:** Any state update triggers re-renders in all subscribed components, including unrelated ones. Performance degrades as features are added.
**Do this instead:** One Zustand slice per concern (`conversionStore`, `historyStore`, `draftStore`, `settingsStore`). Components subscribe only to the slice they need.

### Anti-Pattern 5: Putting Prompt Logic in the Frontend

**What people do:** Build the system prompt string in TypeScript and pass the full prompt to the backend.
**Why it's wrong:** Prompts contain sensitive instructions; exposing them to the WebView context makes them inspectable via devtools. Also splits prompt logic across two languages.
**Do this instead:** Backend owns all prompt construction. Frontend passes only semantic parameters: `style_id`, `input`, `provider_id`. The Rust command assembles the final system prompt from `prompts.rs` (Rust-side templates).

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Anthropic API | `reqwest` POST to `https://api.anthropic.com/v1/messages` | Custom JSON format; API key from Keychain |
| OpenAI / OpenRouter | `reqwest` POST to configurable `base_url + /chat/completions` | Standard OpenAI format; API key from Keychain |
| Ollama / LM Studio | Same OpenAIAdapter with `localhost` base URL | No API key; `api_key = "ollama"` placeholder |
| GitHub Copilot | Device Flow: GET `github.com/login/device/code`, poll token, then POST to `api.githubcopilot.com` | Token stored in Keychain; auto-refresh on 401 |
| OS Keychain | `keyring` crate (v3); `Entry::new(service, username)` | macOS: Security framework; Windows: Credential Manager |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Frontend WebView ↔ Rust backend | Tauri IPC (`invoke`) — JSON-serialized, async | All calls go through typed wrappers in `tauri.ts` |
| Command Layer ↔ Provider Service | Direct Rust function call via `Arc<dyn ProviderAdapter>` | Providers are loaded into AppState at startup |
| Command Layer ↔ DB Service | `AppState.db` Mutex lock; calls into `db/` module functions | DB module returns domain types, not raw SQL rows |
| Provider Service ↔ Keychain | Synchronous `keyring` calls at adapter init and token refresh | Never store keys in AppState beyond initialization |
| Window Manager ↔ Settings DB | Window position/size persisted via `settings` table after resize/move events | Use debounce to avoid thrashing SQLite on every pixel drag |

## Scaling Considerations

This is a single-user desktop app. Scaling means "handles more features without degrading performance or maintainability."

| Concern | Now (MVP) | After Phase 2 | After Phase 3+ |
|---------|-----------|---------------|----------------|
| Provider count | 3 adapters | 3 + Copilot | Add new: implement trait, register in map |
| History volume | 1000 rows default | Same | FTS5 handles up to ~1M rows on SQLite; add `LIMIT` pragma if > 100k |
| Concurrent conversions | Single active conversion | Multiple in-flight (draft buffer) | Provider map is `RwLock`; concurrent reads fine |
| Startup time | < 3 sec target | Add lazy provider init if keychain reads slow startup | Profile with `tracing` if needed |

## Sources

- [Tauri 2 Architecture — official docs](https://v2.tauri.app/concept/architecture/)
- [Tauri 2 State Management — official docs](https://v2.tauri.app/develop/state-management/)
- [Tauri 2 Global Shortcut plugin](https://v2.tauri.app/plugin/global-shortcut/)
- [Tauri 2 SQL plugin](https://v2.tauri.app/plugin/sql/)
- [tauri-sqlite minimal example (RandomEngy)](https://github.com/RandomEngy/tauri-sqlite)
- [tauri-plugin-keyring (community)](https://github.com/HuakunShen/tauri-plugin-keyring)
- [keyring crate v3 — crates.io](https://crates.io/crates/keyring)
- [Tauri floating window discussion](https://github.com/tauri-apps/tauri/discussions/4452)
- Design spec: `docs/pre/romaji-memo-design.md` (HIGH confidence — authoritative for this project)

---
*Architecture research for: Tauri 2 desktop app with AI provider integration (romaji-memo)*
*Researched: 2026-04-05*
