# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## provider-anthropic-not-found — keyring missing apple-native feature causes empty provider map on macOS
- **Date:** 2026-04-05
- **Error patterns:** provider not found, not configured, anthropic, keyring, api_key, None
- **Root cause:** keyring = "3.6" in Cargo.toml has no features. On macOS, the `apple-native` feature is required to use the Security Framework (Keychain). Without it, keyring uses an in-memory mock store that is always empty. So get_api_key returns Ok(None), the anthropic adapter creation is skipped (hits `continue`), and the providers HashMap is empty when convert is called.
- **Fix:** Add `features = ["apple-native"]` to the keyring dependency in src-tauri/Cargo.toml
- **Files changed:** src-tauri/Cargo.toml
---
