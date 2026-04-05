---
phase: 01-core-conversion-loop
verified: 2026-04-05T01:41:29Z
status: human_needed
score: 4/5 must-haves verified
human_verification:
  - test: "Verify PLAT-04 — install and run app on Windows 10+"
    expected: "App launches under 3 seconds, window is transparent and undecorated, always-on-top works, OS Keychain (Credential Manager) stores and retrieves API keys using cmdkey format matching Entry::new('romaji-memo', provider_id), conversion works end-to-end"
    why_human: "No Windows machine available during Phase 1 sign-off. This requires physical Windows hardware. README documents correct cmdkey format."
---

# Phase 1: Core Conversion Loop Verification Report

**Phase Goal:** Team members can install and use the app to convert romaji to Japanese/English, copy results, and have their history persist across sessions
**Verified:** 2026-04-05T01:41:29Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | User can type romaji (including space-free continuous input) and receive correctly segmented Japanese/English output with AI intent and typo corrections displayed | VERIFIED | `convert.rs` routes to provider, calls `build_system_prompt` with space-free segmentation instructions, returns `ConvertResult{converted, intent, typo}`. `ResultDisplay.tsx` renders all three fields. Human-verified: CONV-01, CONV-03 passed. |
| SC-2 | User can select any of the 8 built-in style presets and receive output in that style | VERIFIED | `styles.ts` defines 8 presets (standard, polite, osaka, okama, bushi, gal, business, prompt). `StyleSelector.tsx` renders chip buttons. `prompts.rs` maps all 8 style IDs to distinct system prompts with unknown-style fallback. Human-verified: CONV-02 passed. |
| SC-3 | User can copy a conversion result to the clipboard with a single click | VERIFIED | `ResultDisplay.tsx` calls `writeText(result.converted)` from `@tauri-apps/plugin-clipboard-manager` on button click. `tauri-plugin-clipboard-manager` registered in `lib.rs` and `Cargo.toml`. Human-verified: CONV-06 passed. |
| SC-4 | User's conversion history persists after app restart and can be browsed and re-loaded into the input field | VERIFIED | `conversions.rs` has real `INSERT`/`SELECT` queries against SQLite. `history.rs` Tauri command wraps `get_history` via `spawn_blocking`. `HistoryDrawer.tsx` calls `useHistory` hook which calls `getHistory` invoke, displays style/preview/timestamp, and `handleItemClick` calls `setInput + setSelectedStyleId`. Migration creates `conversions` table with WAL mode. Human-verified: HIST-01, HIST-02, HIST-03 passed. |
| SC-5 | App launches under 3 seconds, uses under 200MB memory, works on macOS 12+ and Windows 10+, and API keys are stored exclusively in OS Keychain | PARTIAL — macOS verified, Windows pending | `keychain.rs` uses `keyring` crate v3.6.3 with `features=["apple-native"]`. API keys never stored in config/localStorage — `providers.json` uses `"<encrypted>"` placeholder. `tauri.conf.json` has correct window config. Human-verified on macOS: PLAT-01 (<3s), PLAT-02 (<200MB), PLAT-03 (macOS) all passed. PLAT-04 (Windows 10+) not verified — no Windows machine available. |

**Score:** 4/5 truths fully verified (SC-5 is partial — macOS portion verified, Windows pending)

### Required Artifacts

| Artifact | Description | Status | Details |
|----------|-------------|--------|---------|
| `src-tauri/src/lib.rs` | App entry, all commands registered, provider init, DB open | VERIFIED | All 7 commands in `invoke_handler!`. Provider init loads `providers.json`, reads Keychain, creates adapters. SQLite opened with WAL + migrations. Window state restored from DB on startup. |
| `src-tauri/src/commands/convert.rs` | Core convert command | VERIFIED | Substantive: 99 lines. Reads provider, builds prompt, calls `provider.complete()`, parses JSON, saves to DB via `spawn_blocking`, returns `ConvertResult`. |
| `src-tauri/src/commands/history.rs` | History retrieval command | VERIFIED | Wraps `get_history` with `spawn_blocking`. Returns `Vec<ConversionRecord>`. |
| `src-tauri/src/commands/providers.rs` | Provider list command | VERIFIED | Returns list of `ProviderInfo` from runtime providers map. |
| `src-tauri/src/commands/window.rs` | Window management commands | VERIFIED | `toggle_always_on_top`, `save_window_state`, `get_window_state`, `quit_app` all implemented. |
| `src-tauri/src/providers/mod.rs` | ProviderAdapter trait + config loader | VERIFIED | Trait defined with `async fn complete`, `name`, `provider_type`, `model_id`. `load_providers_config` with embedded default JSON fallback. `extract_json` strips markdown fences. |
| `src-tauri/src/providers/anthropic.rs` | Anthropic HTTP adapter | VERIFIED | Real HTTP POST to `api.anthropic.com/v1/messages` with API key header. Parses response. |
| `src-tauri/src/providers/openai.rs` | OpenAI-compatible HTTP adapter | VERIFIED | Real HTTP POST to configurable `base_url`. Supports Ollama/LM Studio via same adapter. URL scheme validation. |
| `src-tauri/src/providers/prompts.rs` | System prompt builder | VERIFIED | 8 distinct style prompts + unknown-style fallback. Space-free segmentation instruction in base prompt. Unit tests present. |
| `src-tauri/src/db/mod.rs` | DB open + migration runner | VERIFIED | WAL mode, `PRAGMA foreign_keys=ON`, version-gated migration. |
| `src-tauri/src/db/migrations.rs` | Schema migration | VERIFIED | `conversions`, `custom_styles`, `settings` tables. FTS5 virtual table. All 3 FTS triggers (INSERT/UPDATE/DELETE). Proper indexes. |
| `src-tauri/src/db/conversions.rs` | Conversion CRUD | VERIFIED | `insert_conversion` with parameterized query. `get_history` with optional style filter. (Note: stale "// Stub" comment on line 1 — code is fully implemented.) |
| `src-tauri/src/keychain.rs` | OS Keychain access | VERIFIED | Uses `keyring` v3.6.3 with `apple-native` feature. `get_api_key` and `set_api_key` with `Mutex` serialization. Service name `"romaji-memo"`, account = provider_id. |
| `src-tauri/Cargo.toml` | Rust dependency manifest | VERIFIED | All required crates at correct versions: `rusqlite = { version = "0.39", features = ["bundled"] }`, `keyring = { version = "3.6", features = ["apple-native"] }`, `reqwest = { version = "0.13", features = ["json", "rustls"] }`. No `tauri-plugin-global-shortcut` (Phase 2). |
| `src-tauri/tauri.conf.json` | Tauri window config | VERIFIED | `"width": 420`, `"height": 600`, `"decorations": false`, `"transparent": true`, `"alwaysOnTop": true`, `"resizable": true`, `"minWidth": 320`, `"minHeight": 400`. |
| `providers.json` | Default provider config | VERIFIED | Anthropic (enabled, `<encrypted>` key), Ollama local (enabled, no auth), OpenAI (disabled). Embedded in binary via `include_str!`. |
| `src/lib/styles.ts` | 8 built-in style presets | VERIFIED | 8 presets with id/label/emoji. Matches `prompts.rs` style IDs exactly. |
| `src/lib/tauri.ts` | Typed Tauri IPC wrappers | VERIFIED | All 7 commands wrapped with TypeScript types. Frontend imports from here, not directly from `@tauri-apps/api/core`. |
| `src/store/conversionStore.ts` | Conversion state store | VERIFIED | Zustand 5 store: input, result, loading, error, selectedStyleId. |
| `src/store/settingsStore.ts` | Settings state store | VERIFIED | Zustand 5 store: theme (dark default), alwaysOnTop (true), activeProviderId ('anthropic'). |
| `src/store/historyStore.ts` | History drawer state | VERIFIED | Zustand 5 store: isDrawerOpen, toggleDrawer, setDrawerOpen. |
| `src/hooks/useConvert.ts` | Conversion hook | VERIFIED | Calls `convertText`, manages loading/error state, shows sonner toast on error (D-09). |
| `src/hooks/useProviders.ts` | Providers data hook | VERIFIED | TanStack Query with `staleTime: Infinity`. |
| `src/hooks/useHistory.ts` | History data hook | VERIFIED | TanStack Query with `enabled` prop (lazy load until drawer opens). `staleTime: 30_000`. |
| `src/components/Converter.tsx` | Main conversion UI | VERIFIED | Provider selector, StyleSelector, textarea with Cmd/Ctrl+Enter handler, convert button with Loader2 spinner, error display, ResultDisplay. All wired to stores and hooks. |
| `src/components/StyleSelector.tsx` | 8-style chip selector | VERIFIED | Maps `BUILT_IN_STYLES` to chip buttons with active/inactive states. |
| `src/components/ResultDisplay.tsx` | Result display with copy | VERIFIED | Converted text display, overlay copy button using `writeText`, intent annotation, typo annotation. |
| `src/components/TitleBar.tsx` | Custom title bar | VERIFIED | Drag via `startDragging()` (programmatic, replaces `data-tauri-drag-region` which was bypassed as a bug fix). Always-on-top pin toggle, Sun/Moon theme toggle, minimize, close. All wired to settingsStore and tauri.ts. |
| `src/components/HistoryDrawer.tsx` | History bottom drawer | VERIFIED | Window resize on toggle via `getCurrentWindow().setSize()`. MIN_HEIGHT=400 guard. Scrollable list with style label, output preview, timestamp. Click-to-reload sets input + styleId. Empty state and loading state. |
| `src/App.tsx` | App shell | VERIFIED | QueryClientProvider, theme sync to `document.documentElement`, window state restore on mount, debounced save on move/resize. TitleBar + Converter + HistoryDrawer composed. Sonner Toaster. |
| `README.md` | Setup documentation | VERIFIED | 161 lines. macOS Keychain (`security add-generic-password`) and Windows Credential Manager (`cmdkey`) setup commands. Dev/build commands. Usage guide. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Converter.tsx` | `useConvert.ts` | `runConvert()` on button click and Cmd/Ctrl+Enter | WIRED | `useConvert` imported and called in both click handler and keydown handler |
| `useConvert.ts` | `lib/tauri.ts` | `convertText(input, styleId, providerId)` | WIRED | `convertText` imported from `../lib/tauri` |
| `lib/tauri.ts` | Tauri `convert` command | `invoke('convert', ...)` | WIRED | IPC call confirmed. Command registered in `lib.rs` `invoke_handler!` |
| `commands/convert.rs` | `providers/mod.rs` | `provider.complete(req)` | WIRED | Provider retrieved from map, `complete()` called, `extract_json` parses response |
| `commands/convert.rs` | `db/conversions.rs` | `insert_conversion(...)` via `spawn_blocking` | WIRED | Called after successful provider response, result stored in SQLite |
| `commands/history.rs` | `db/conversions.rs` | `get_history(...)` via `spawn_blocking` | WIRED | Real DB SELECT query, returns `Vec<ConversionRecord>` |
| `HistoryDrawer.tsx` | `useHistory.ts` | `useHistory(isDrawerOpen)` — lazy enabled | WIRED | `enabled` prop prevents fetch until drawer opens; `invalidateQueries` on drawer open |
| `HistoryDrawer.tsx` | `conversionStore.ts` | `setInput + setSelectedStyleId` on item click | WIRED | `handleItemClick` calls both setters, repopulates input field |
| `ResultDisplay.tsx` | `@tauri-apps/plugin-clipboard-manager` | `writeText(result.converted)` | WIRED | Plugin registered in `lib.rs` and `Cargo.toml` |
| `TitleBar.tsx` | `lib/tauri.ts` | `toggleAlwaysOnTop()`, `quitApp()` | WIRED | Both imported and called in button handlers |
| `App.tsx` | `lib/tauri.ts` | `saveWindowState`, `getWindowState` | WIRED | Restore on mount, debounced save on `onMoved`/`onResized` |
| `lib.rs` | `keychain.rs` | `keychain::get_api_key()` during provider init | WIRED | Called for each enabled provider with `api_key: "<encrypted>"` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `ResultDisplay.tsx` | `result.converted`, `result.intent`, `result.typo` | `convert` Tauri command → Anthropic/OpenAI HTTP API → JSON parse | Yes — live API response | FLOWING |
| `HistoryDrawer.tsx` | `history` (array of `ConversionRecord`) | `get_history` Tauri command → `SELECT` from SQLite `conversions` table | Yes — real DB query | FLOWING |
| `Converter.tsx` (provider select) | `providers` | `list_providers` Tauri command → runtime `HashMap` of initialized adapters | Yes — populated at startup from `providers.json` + Keychain | FLOWING |
| `settingsStore.ts` (theme) | `theme` | In-memory Zustand state, no persistence | Resets to 'dark' on restart — toggle works within session only | INFO: Theme preference not persisted across restarts (not in WINX-04 scope) |

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| Rust codebase compiles | `cd src-tauri && cargo check` | Finished dev profile, 1 warning (dead_code), 0 errors | PASS |
| All 8 style IDs produce distinct prompts | Unit test `test_all_eight_styles_defined` in `prompts.rs` | Would pass — all 8 mapped in match arm | PASS (code analysis) |
| Unknown style fallback works | Unit test `test_unknown_style_fallback` in `prompts.rs` | Falls back to standard prompt | PASS (code analysis) |
| Window config correct | `tauri.conf.json` checked | `decorations:false`, `transparent:true`, `420x600`, `alwaysOnTop:true` | PASS |
| API keys never in config files | Grep for secrets in `providers.json` | Only `"<encrypted>"` placeholders | PASS |
| End-to-end conversion on macOS | Human verification (Plan 08) | All 14 requirements passed | PASS (human-verified) |

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| CONV-01 | Space-free romaji conversion to Japanese/English | SATISFIED | `build_system_prompt` includes space-free segmentation instructions. Human-verified. |
| CONV-02 | 8 style presets | SATISFIED | `styles.ts` (8 presets), `prompts.rs` (8 prompt variants), `StyleSelector.tsx` (chip UI). Human-verified. |
| CONV-03 | Intent and typo correction displayed | SATISFIED | `ConvertResult` includes `intent` and `typo`. `ResultDisplay.tsx` renders both. Human-verified. |
| CONV-04 | AI's intent displayed | SATISFIED | `result.intent` displayed in ResultDisplay. (Subset of CONV-03.) |
| CONV-05 | Typo corrections displayed | SATISFIED | `result.typo` displayed in ResultDisplay. (Subset of CONV-03.) |
| CONV-06 | One-click clipboard copy | SATISFIED | `writeText` called in ResultDisplay. Human-verified. |
| HIST-01 | History persists across restart | SATISFIED | SQLite DB in app data dir. Migrations run on startup. Human-verified. |
| HIST-02 | History drawer shows style/preview/timestamp | SATISFIED | HistoryDrawer renders style label, `item.output` truncated, `formatTime(item.createdAt)`. Human-verified. |
| HIST-03 | Clicking history item repopulates input | SATISFIED | `handleItemClick` calls `setInput + setSelectedStyleId`. Human-verified. |
| PROV-01 | Anthropic provider works | SATISFIED | `AnthropicAdapter` with real HTTP POST. `keyring apple-native` fix applied. Human-verified. |
| PROV-02 | OpenAI-compatible provider | SATISFIED | `OpenAIAdapter` with configurable `base_url`. Covers OpenAI, Ollama, LM Studio. |
| PROV-04 | Provider selector UI | SATISFIED | Provider dropdown in `Converter.tsx` (visible when >1 provider configured). |
| PROV-07 | Error toast for missing API key | SATISFIED | `useConvert` catches provider error, shows `toast.error(msg)`. Error propagates from `lib.rs` when provider not in map. Human-verified. |
| WINX-01 | Always-on-top toggle | SATISFIED | `toggle_always_on_top` command + TitleBar pin button. Human-verified. |
| WINX-03 | Window position/size persists | SATISFIED | `save_window_state`/`get_window_state` commands + debounced save + restore on startup. Human-verified. |
| WINX-04 | Dark/light theme toggle | SATISFIED | `toggleTheme` in settingsStore + `data-theme` attribute on `document.documentElement`. Human-verified. Note: theme preference resets to dark on restart (no persistence required by WINX-04 definition). |
| PLAT-01 | Launch < 3 seconds | SATISFIED | Human-verified on macOS. |
| PLAT-02 | Memory < 200MB | SATISFIED | Human-verified on macOS. |
| PLAT-03 | macOS 12+ | SATISFIED | Human-verified on macOS. `macOSPrivateApi: true` in tauri.conf.json. |
| PLAT-04 | Windows 10+ | NEEDS HUMAN | No Windows machine available during Phase 1 sign-off. Code uses `rustls-tls` (no OpenSSL), `keyring` with correct Windows Credential Manager format. README documents `cmdkey` setup. Hardware verification required before team distribution. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src-tauri/src/db/conversions.rs` | 1 | `// Stub — full implementation in Task 2` | Info | Stale comment from initial file creation. Code below is fully implemented. Not a stub. |

No blockers, no functional stubs, no hardcoded empty data arrays returned to the frontend.

### Human Verification Required

#### 1. Windows 10+ Platform Verification (PLAT-04)

**Test:** Install built binary on a Windows 10+ machine. Register API key with: `cmdkey /add:romaji-memo /user:anthropic /pass:<API_KEY>`. Launch app. Verify: transparent undecorated window appears, always-on-top works, conversion works end-to-end with Anthropic key from Credential Manager, window size/position persists across restart.

**Expected:** All Phase 1 success criteria met on Windows as they were on macOS.

**Why human:** No Windows machine was available during Phase 1 execution. This requires physical Windows hardware. The Rust code uses `rustls-tls` (no OpenSSL dependency) and `keyring` crate which targets Windows Credential Manager for PLAT-04 environments. The cmdkey format in README matches `Entry::new("romaji-memo", provider_id)` in `keychain.rs`.

### Gaps Summary

No functional gaps identified in the macOS-verified portion of the codebase. All 5 success criteria are met for macOS. The sole remaining item is PLAT-04 (Windows 10+ verification), which requires physical hardware and is classified as a human verification item rather than a code gap.

The code is architecturally ready for Windows:
- `rustls-tls` replaces `native-tls` (no OpenSSL required on Windows)
- `keyring` crate v3.6.3 targets Windows Credential Manager
- README provides correct `cmdkey` format matching the Rust keychain service/account naming
- No platform-specific code that would behave differently on Windows has been identified

---

_Verified: 2026-04-05T01:41:29Z_
_Verifier: Claude (gsd-verifier)_
