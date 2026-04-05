---
status: resolved
trigger: "App launches but converting shows 'Provider 'anthropic' not found or not configured'"
created: 2026-04-05T00:00:00Z
updated: 2026-04-05T00:00:00Z
---

## Current Focus

hypothesis: keyring crate missing `apple-native` feature → macOS Keychain not used → mock store returns NoEntry → api_key is None → anthropic adapter skipped → providers map empty
test: applied fix — add `features = ["apple-native"]` to keyring in Cargo.toml
expecting: adapter now registered, convert command succeeds
next_action: user to launch built app and attempt romaji conversion to confirm fix

## Symptoms

expected: App finds the anthropic provider and uses it to convert romaji
actual: Error message "Provider 'anthropic' not found or not configured" when attempting a conversion
errors: "Provider 'anthropic' not found or not configured"
reproduction: Launch app, attempt romaji conversion
started: First test after building Phase 1

## Eliminated

- hypothesis: providers.json missing or malformed
  evidence: File exists at both project root and app data dir; content is correct with id "anthropic", adapter "anthropic", enabled true
  timestamp: 2026-04-05T00:00:00Z

- hypothesis: Keychain entry not created
  evidence: `security find-generic-password -s "romaji-memo" -a "anthropic"` confirms entry exists with a valid sk-ant-api key
  timestamp: 2026-04-05T00:00:00Z

- hypothesis: frontend sends wrong provider_id
  evidence: settingsStore.ts hardcodes `activeProviderId: 'anthropic'`; tauri.ts passes it directly as `providerId`; Tauri 2 IPC converts camelCase→snake_case automatically
  timestamp: 2026-04-05T00:00:00Z

- hypothesis: adapter type string mismatch
  evidence: providers.json adapter field is "anthropic"; lib.rs matches on `"anthropic"` string; identical
  timestamp: 2026-04-05T00:00:00Z

## Evidence

- timestamp: 2026-04-05T00:00:00Z
  checked: src-tauri/Cargo.toml keyring dependency declaration
  found: `keyring = "3.6"` — no features specified
  implication: Without `apple-native` feature, keyring uses in-memory mock store on macOS

- timestamp: 2026-04-05T00:00:00Z
  checked: src-tauri/Cargo.lock keyring dependencies
  found: Only `log` and `zeroize` — no `security-framework`
  implication: Confirmed: macOS Security Framework not compiled in; Keychain never accessed

- timestamp: 2026-04-05T00:00:00Z
  checked: ~/.cargo/registry/.../keyring-3.6.3/Cargo.toml.orig features section
  found: `apple-native = ["dep:security-framework"]` is an opt-in feature, not default
  implication: Must explicitly add `features = ["apple-native"]` in Cargo.toml to use macOS Keychain

- timestamp: 2026-04-05T00:00:00Z
  checked: lib.rs lines 74-86 (anthropic adapter creation)
  found: If api_key is None, code does `continue` — adapter never inserted into providers_map
  implication: Empty Keychain lookup → missing adapter → "Provider not found" error at convert time

## Resolution

root_cause: keyring = "3.6" in Cargo.toml has no features. On macOS, the `apple-native` feature is required to use the Security Framework (Keychain). Without it, keyring uses an in-memory mock store that is always empty. So get_api_key returns Ok(None), lib.rs skips the anthropic adapter creation (hits `continue`), and the providers HashMap is empty when convert is called.
fix: Add `features = ["apple-native"]` to the keyring dependency in src-tauri/Cargo.toml
verification: confirmed fixed — user verified conversion works end-to-end after rebuild
files_changed: [src-tauri/Cargo.toml]
