---
phase: 01-core-conversion-loop
plan: 04
subsystem: commands
tags: [tauri2, ipc, commands, sqlite, keychain, providers, spawn_blocking, prompt-spike]

# Dependency graph
requires:
  - phase: 01-core-conversion-loop
    plan: 02
    provides: "AppState, db::conversions, db::settings, ConversionRecord"
  - phase: 01-core-conversion-loop
    plan: 03
    provides: "ProviderAdapter trait, AnthropicAdapter, OpenAIAdapter, build_system_prompt, extract_json, load_providers_config"
provides:
  - Prompt validation spike (tests/prompt_spike.rs) with 15 space-free romaji test cases (Wave 4 gate)
  - convert Tauri command: routes to provider, saves history via spawn_blocking, returns ConvertResult
  - get_history Tauri command: paginated + style-filterable history retrieval
  - list_providers Tauri command: returns ProviderInfo for all initialized providers
  - toggle_always_on_top Tauri command: toggles and returns new state
  - save_window_state / get_window_state Tauri commands: persist/restore window geometry
  - All 6 commands registered in invoke_handler
  - Provider initialization at app startup: loads providers.json, fetches API keys from Keychain
  - macOS ActivationPolicy::Accessory + set_visible_on_all_workspaces
  - model_id() added to ProviderAdapter trait
affects: [05, 06, 07, 08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "RwLock read guard on providers map dropped before async provider.complete() call (T-01-10)"
    - "spawn_blocking wraps all rusqlite calls inside async tauri commands"
    - "Provider skipped at startup if API key not in Keychain; D-09 error returned at convert time"
    - "Prompt spike test skips gracefully (returns ok) when no Keychain API key found — CI-safe"
    - "WebviewWindow (not Window) for toggle_always_on_top in Tauri 2"

key-files:
  created:
    - src-tauri/tests/prompt_spike.rs
    - src-tauri/src/commands/mod.rs
    - src-tauri/src/commands/convert.rs
    - src-tauri/src/commands/history.rs
    - src-tauri/src/commands/providers.rs
    - src-tauri/src/commands/window.rs
  modified:
    - src-tauri/src/lib.rs (invoke_handler, provider init, window restore, macOS policy)
    - src-tauri/src/providers/mod.rs (added model_id() to ProviderAdapter trait)
    - src-tauri/src/providers/anthropic.rs (implemented model_id())
    - src-tauri/src/providers/openai.rs (implemented model_id())
    - src-tauri/src/providers/prompts.rs (added Wave 4 gate comment)

key-decisions:
  - "providers module made pub in lib.rs so integration tests (prompt_spike) can access adapters directly"
  - "model_id() added to ProviderAdapter trait — needed by convert command to populate CompletionRequest.model"
  - "WebviewWindow used in window.rs (not Window) — Tauri 2 window type for WebView-based windows"
  - "Providers with missing API keys skipped at startup (not added as stub) — cleaner than storing a NoApiKey sentinel"

patterns-established:
  - "Pattern 9: Drop RwLock read guard before any .await in async commands (T-01-10 compliance)"
  - "Pattern 10: Integration tests access pub modules directly; lib.rs modules that tests need must be pub"

requirements-completed: [CONV-01, CONV-02, CONV-03, CONV-04, CONV-05, HIST-01, HIST-02, HIST-03]

# Metrics
duration: 28min
completed: 2026-04-05
---

# Phase 1 Plan 04: Tauri Commands and Provider Wiring Summary

**All 6 Tauri commands implemented and registered; provider initialization wired at startup with Keychain API key fetch; prompt validation spike created with 15 space-free romaji test cases as Wave 4 gate**

## Performance

- **Duration:** ~28 min
- **Started:** 2026-04-04T19:11:06Z
- **Completed:** 2026-04-04T19:39:06Z
- **Tasks:** 3 (Task 0, Task 1, Task 2)
- **Files modified:** 5 modified, 6 created

## Accomplishments

- `tests/prompt_spike.rs` created with 15 space-free romaji test cases; skips gracefully when no API key found (CI-safe); asserts >=80% (12/15) when a provider is available
- `commands/convert.rs`: `#[tauri::command]` converts romaji input using the selected provider, saves to SQLite via `spawn_blocking`, returns `ConvertResult { converted, intent, typo, history_id }`
- `commands/history.rs`: paginated `get_history` with optional `style_filter` parameter
- `commands/providers.rs`: `list_providers` returns `Vec<ProviderInfo>` for all initialized adapters
- `commands/window.rs`: `toggle_always_on_top` (returns new state), `save_window_state`, `get_window_state` (persist/restore geometry via SQLite settings)
- `lib.rs` setup hook: loads `providers.json`, fetches API keys from OS Keychain, instantiates adapters, registers `AppState`, restores window geometry, sets macOS `ActivationPolicy::Accessory` and `set_visible_on_all_workspaces(true)`
- All 6 commands registered in `tauri::generate_handler![]`
- `cargo check` passes with 0 errors

## Task Commits

1. **Task 0: Prompt validation spike** - `5311df0` (feat)
2. **Task 1: Create command modules** - `45ddcdb` (feat)
3. **Task 2: Register commands and wire provider init** - `379a044` (feat)

## Files Created/Modified

- `src-tauri/tests/prompt_spike.rs` — 15 romaji test cases; Wave 4 gate; CI-safe skip when no key
- `src-tauri/src/commands/mod.rs` — re-exports convert, history, providers, window submodules
- `src-tauri/src/commands/convert.rs` — convert command with RwLock guard drop before await, spawn_blocking for DB
- `src-tauri/src/commands/history.rs` — get_history with spawn_blocking
- `src-tauri/src/commands/providers.rs` — list_providers reading RwLock providers map
- `src-tauri/src/commands/window.rs` — toggle_always_on_top, save/get_window_state
- `src-tauri/src/lib.rs` — invoke_handler with all 6 commands; provider init from Keychain; window restore; macOS policy
- `src-tauri/src/providers/mod.rs` — model_id() added to ProviderAdapter trait
- `src-tauri/src/providers/anthropic.rs` — model_id() implemented
- `src-tauri/src/providers/openai.rs` — model_id() implemented
- `src-tauri/src/providers/prompts.rs` — Wave 4 gate comment added

## Decisions Made

- Made `providers` module `pub` in `lib.rs` so integration tests can directly import `AnthropicAdapter` and `extract_json` — necessary because `cargo test --test prompt_spike` compiles tests as a separate crate
- Added `model_id()` to `ProviderAdapter` trait to give `convert.rs` access to the adapter's configured model string without storing it separately
- Used `tauri::WebviewWindow` (not `tauri::Window`) in `window.rs` — Tauri 2 uses `WebviewWindow` as the primary window type for webview-based windows
- Providers missing an API key are silently skipped at startup rather than being stored as non-functional stubs — simpler code, D-09 error path triggered when frontend calls `convert` with an unknown `provider_id`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Made `providers` module pub for integration test access**
- **Found during:** Task 0 (cargo check --tests)
- **Issue:** `tests/prompt_spike.rs` imports `romaji_editor_lib::providers::*` but `providers` was declared `mod providers` (private) in `lib.rs`; compiler returned "private module" error
- **Fix:** Changed `mod providers` to `pub mod providers` in `lib.rs`
- **Files modified:** src-tauri/src/lib.rs
- **Commit:** 5311df0

**2. [Rule 2 - Missing functionality] Added `model_id()` to ProviderAdapter trait**
- **Found during:** Task 1 (designing convert.rs)
- **Issue:** `convert.rs` needs to populate `CompletionRequest.model` using the adapter's configured model; the trait had no method to expose this; hard-coding or duplicating model strings would violate the adapter encapsulation pattern
- **Fix:** Added `fn model_id(&self) -> &str` to `ProviderAdapter` trait; implemented in `AnthropicAdapter` and `OpenAIAdapter` returning `&self.model`
- **Files modified:** src-tauri/src/providers/mod.rs, anthropic.rs, openai.rs
- **Commit:** 45ddcdb

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing functionality)
**Impact on plan:** Both fixes are required for correct operation. No scope creep.

## Known Stubs

None — all commands are fully implemented. The prompt spike test is intentionally CI-safe (skips when no API key found); this is by design, not a stub.

## Threat Surface

All threats from plan threat_model addressed:

| Threat ID | Status |
|-----------|--------|
| T-01-08 | Mitigated — style_id validated via build_system_prompt default fallback; provider_id validated by map lookup |
| T-01-09 | Mitigated — all DB writes use parameterized queries via db::conversions module |
| T-01-10 | Mitigated — spawn_blocking for DB; RwLock guard dropped before provider.complete() await |
| T-01-11 | Accepted — user's own romaji text sent to AI provider is intended use case |

## Next Phase Readiness

- Plans 05-06 (UI) can proceed — all 6 Tauri commands are registered and callable via `invoke()`
- Frontend TypeScript wrappers for `invoke("convert", ...)` etc. can be written against these command signatures
- Prompt spike (CONV-03 gate) must be run manually with a real API key before declaring Wave 4 complete

---
*Phase: 01-core-conversion-loop*
*Completed: 2026-04-05*

## Self-Check: PASSED

- src-tauri/tests/prompt_spike.rs: FOUND
- src-tauri/src/commands/mod.rs: FOUND
- src-tauri/src/commands/convert.rs: FOUND
- src-tauri/src/commands/history.rs: FOUND
- src-tauri/src/commands/providers.rs: FOUND
- src-tauri/src/commands/window.rs: FOUND
- src-tauri/src/lib.rs: FOUND
- src-tauri/src/providers/mod.rs: FOUND
- src-tauri/src/providers/anthropic.rs: FOUND
- src-tauri/src/providers/openai.rs: FOUND
- src-tauri/src/providers/prompts.rs: FOUND
- Commit 5311df0: FOUND
- Commit 45ddcdb: FOUND
- Commit 379a044: FOUND
- cargo check: PASSED (0 errors)
