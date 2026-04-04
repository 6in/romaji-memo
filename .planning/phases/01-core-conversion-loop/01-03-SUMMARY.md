---
phase: 01-core-conversion-loop
plan: 03
subsystem: providers
tags: [keyring, reqwest, anthropic, openai, ollama, async-trait, thiserror, providers]

# Dependency graph
requires:
  - phase: 01-core-conversion-loop
    plan: 01
    provides: "Tauri 2 scaffold with keyring 3.6, reqwest 0.13, async-trait 0.1, thiserror 2 in Cargo.toml"
  - phase: 01-core-conversion-loop
    plan: 02
    provides: "AppState with keychain_lock: Mutex<()>, providers stub in providers/mod.rs"
provides:
  - OS Keychain read/write via keyring crate with Mutex serialization
  - ProviderAdapter trait with async complete(), name(), provider_type()
  - CompletionRequest, CompletionResponse, TokenUsage, ConvertOutput types
  - ProviderError enum (Http, Api, Parse, NoApiKey variants)
  - AnthropicAdapter: POST api.anthropic.com/v1/messages with x-api-key + anthropic-version headers
  - OpenAIAdapter: POST {base_url}/chat/completions with bearer_auth; http/https scheme validation
  - build_system_prompt() with all 8 style presets
  - providers.json default config with <encrypted> placeholders
  - load_providers_config() with embedded default fallback via include_str!
  - extract_json() helper strips markdown fences before JSON parsing
affects: [04, 05, 06, 07, 08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AnthropicAdapter uses x-api-key header (not Bearer) + anthropic-version: 2023-06-01"
    - "OpenAIAdapter validates base_url scheme (http/https only) before constructing endpoint URL"
    - "providers.json embedded via include_str! as fallback; copied to app_data_dir on first run"
    - "extract_json() strips ```json / ``` fences before serde_json::from_str"
    - "keychain.rs uses blocking_lock() — must be called from spawn_blocking context"
    - "NoEntry error from keyring maps to Ok(None), not Err — caller triggers D-09 toast"

key-files:
  created:
    - src-tauri/src/keychain.rs
    - src-tauri/src/providers/anthropic.rs
    - src-tauri/src/providers/openai.rs
    - src-tauri/src/providers/prompts.rs
    - providers.json
  modified:
    - src-tauri/src/providers/mod.rs (stub replaced with full trait + types)
    - src-tauri/src/lib.rs (added pub mod keychain)

key-decisions:
  - "URL scheme validation in OpenAIAdapter uses starts_with check (not url crate) to avoid implicit transitive dep"
  - "include_str! path ../../../providers.json resolves from src-tauri/src/providers/ to project root"
  - "NoApiKey ProviderError variant message matches D-09 toast text: 'Run setup command in README'"

patterns-established:
  - "Pattern 7: Keychain reads must be in spawn_blocking — blocking_lock() is correct, not lock().await"
  - "Pattern 8: base_url scheme validation guards against file://, data:// injection before constructing AI endpoint URL"

requirements-completed: [PROV-01, PROV-02, PROV-07]

# Metrics
duration: 12min
completed: 2026-04-05
---

# Phase 1 Plan 03: Provider System Summary

**Keychain module (Mutex-guarded OS Keychain), ProviderAdapter trait with AnthropicAdapter and OpenAIAdapter, system prompt assembly with 8 style presets, and default providers.json configuration**

## Performance

- **Duration:** ~12 min
- **Tasks:** 2
- **Files modified:** 2 modified, 5 created

## Accomplishments

- `keychain.rs` reads/writes API keys from OS Keychain; `blocking_lock()` serializes all access; `NoEntry` returns `Ok(None)` to distinguish unconfigured from error
- `ProviderAdapter` trait with `async fn complete()`, `name()`, `provider_type()` replaces the Plan 02 stub
- `AnthropicAdapter` sends POST to `api.anthropic.com/v1/messages` with correct headers (`x-api-key`, `anthropic-version: 2023-06-01`)
- `OpenAIAdapter` works with any `base_url` (OpenAI, Ollama, LM Studio) using `bearer_auth`; validates http/https scheme (T-01-05 mitigation)
- `build_system_prompt()` covers all 8 styles: standard, polite, osaka, okama, bushi, gal, business, prompt; includes space-free romaji boundary inference instruction
- `providers.json` has three default providers (anthropic, ollama-local, openai) with `<encrypted>` placeholders; no real API keys in config
- `cargo check` passes with 0 errors (7 pre-existing dead_code warnings from Plan 02 stubs)

## Task Commits

1. **Task 1: Create Keychain module** - `aaa0797` (feat)
2. **Task 2: ProviderAdapter trait, adapters, prompts, providers.json** - `0865bf3` (feat)

## Files Created/Modified

- `src-tauri/src/keychain.rs` — get_api_key / set_api_key with Mutex guard
- `src-tauri/src/providers/mod.rs` — full trait + types, replacing stub from Plan 02
- `src-tauri/src/providers/anthropic.rs` — AnthropicAdapter implementing ProviderAdapter
- `src-tauri/src/providers/openai.rs` — OpenAIAdapter with base_url + scheme validation
- `src-tauri/src/providers/prompts.rs` — build_system_prompt with 8 styles
- `providers.json` — default provider configs (no secrets)
- `src-tauri/src/lib.rs` — added pub mod keychain

## Decisions Made

- URL scheme validation in `OpenAIAdapter` uses `starts_with("http://") || starts_with("https://")` instead of the `url` crate (which is only a transitive dep) — simpler and correct for this use case
- `include_str!("../../../providers.json")` embeds the default config at compile time; `load_providers_config()` copies it to app_data_dir on first run
- `NoApiKey` variant message: "Run setup command in README." — matches D-09 toast text

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] Added http/https scheme validation to OpenAIAdapter (T-01-05)**
- **Found during:** Task 2 implementation (threat model review)
- **Issue:** Plan's T-01-05 threat register requires base_url scheme validation but did not specify implementation
- **Fix:** Added `validated_completions_url()` that rejects non-http/https schemes before constructing the endpoint URL
- **Files modified:** src-tauri/src/providers/openai.rs
- **Committed in:** 0865bf3

**2. [Rule 1 - Bug] Removed implicit url crate dependency**
- **Found during:** Task 2 (code review before commit)
- **Issue:** Initial draft used `url::Url` for scheme parsing — `url` is only a transitive dep of reqwest, not declared in Cargo.toml
- **Fix:** Replaced with `starts_with("http://") || starts_with("https://")` string check
- **Files modified:** src-tauri/src/providers/openai.rs
- **Committed in:** 0865bf3

---

**Total deviations:** 2 auto-fixed (1 security mitigation, 1 dependency fix)
**Impact on plan:** Both fixes improve correctness and security. No scope creep.

## Known Stubs

None — all provider implementations are complete. API keys use `<encrypted>` placeholder intentionally (D-08); real keys are fetched from OS Keychain at runtime.

## Threat Surface

All threats from plan threat_model addressed:

| Threat ID | Status |
|-----------|--------|
| T-01-04 | Mitigated — API keys only via keyring crate, never in config/localStorage |
| T-01-05 | Mitigated — base_url scheme validated to http/https before use |
| T-01-06 | Mitigated — providers.json uses `<encrypted>` placeholder throughout |
| T-01-07 | Mitigated — Mutex serializes all keychain access |

## Next Phase Readiness

- Plan 04 (convert command) can proceed — ProviderAdapter trait + both adapters are fully implemented
- Plan 05+ (UI) can proceed — ConvertOutput struct defines the shape of conversion results
- Keychain setup: developers must run `security add-generic-password -s "romaji-memo" -a "anthropic" -w "<API_KEY>"` (macOS) before using Anthropic provider

---
*Phase: 01-core-conversion-loop*
*Completed: 2026-04-05*

## Self-Check: PASSED

- src-tauri/src/keychain.rs: FOUND
- src-tauri/src/providers/mod.rs: FOUND
- src-tauri/src/providers/anthropic.rs: FOUND
- src-tauri/src/providers/openai.rs: FOUND
- src-tauri/src/providers/prompts.rs: FOUND
- providers.json: FOUND
- src-tauri/src/lib.rs (mod keychain): FOUND
- Commit aaa0797: FOUND
- Commit 0865bf3: FOUND
- cargo check: PASSED (0 errors)
