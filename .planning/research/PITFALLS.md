# Pitfalls Research

**Domain:** Tauri 2 + React desktop app with AI text conversion, SQLite history, OS Keychain secrets, floating window
**Researched:** 2026-04-05
**Confidence:** MEDIUM (WebSearch verified against official Tauri docs and GitHub issues; some claims HIGH where official issue trackers confirm)

---

## Critical Pitfalls

### Pitfall 1: AI Streaming Buffered at Compile Time (Not in Dev)

**What goes wrong:**
The conversion UI shows no streaming feedback in the shipped binary. All tokens arrive at once after the full response completes. In `tauri dev` everything looks fine, so the bug is only discovered after packaging.

**Why it happens:**
Developers proxy the AI provider's HTTP response directly through a Tauri command (`#[tauri::command]`). Commands are request-response: the entire `Result<T>` must be serialized before being returned to the frontend. The runtime buffers the full response body before resolving. It works in dev because devtools mask the latency.

**How to avoid:**
Use Tauri **channels** (not events, not commands) for token streaming. The pattern is:
1. Frontend calls `invoke("convert", { ..., channel })` passing a `Channel<String>` handle.
2. Rust reads SSE/streaming chunks from reqwest and calls `channel.send(chunk)` per token.
3. Frontend accumulates tokens in a Zustand slice as they arrive.

The `tauri::ipc::Channel` API is the correct primitive for this. Events (`emit`) work but are documented as unsuitable for high-throughput or low-latency use. Do not use the event system for token streaming.

**Warning signs:**
- Conversion feels "instant then all at once" in the packaged `.app` / `.exe`
- Response appears character-by-character in `tauri dev` but not in the build

**Phase to address:**
Phase 1 (MVP) — build the streaming architecture first. Retrofitting from command-response to channel-based streaming after the UI is built requires a full rework of `useConvert.ts`, the Rust command signature, and the Zustand slice.

---

### Pitfall 2: FTS5 Virtual Table Becomes Stale / Corrupts Silently

**What goes wrong:**
Full-text search (`conversions_fts`) returns wrong or empty results, or triggers database corruption (reported ~10% corruption rate in the SQLite forum when triggers are defined incorrectly).

**Why it happens:**
The design uses `content='conversions'` (external content table). FTS5 does not automatically mirror the base table — it requires explicit INSERT/UPDATE/DELETE triggers on `conversions` to keep the index in sync. A missing `DELETE` trigger on `UPDATE` or incorrect trigger syntax (missing the shadow `delete` pseudo-command) silently diverges the index.

Additionally, triggers that insert into FTS5 tables can fail to transact inside RETURNING-clause statements, causing silent index misses.

**How to avoid:**
Create all three trigger types at schema creation time, in a single migration transaction:
```sql
-- On INSERT
CREATE TRIGGER conversions_ai AFTER INSERT ON conversions BEGIN
  INSERT INTO conversions_fts(rowid, input, output) VALUES (new.id, new.input, new.output);
END;

-- On DELETE
CREATE TRIGGER conversions_ad AFTER DELETE ON conversions BEGIN
  INSERT INTO conversions_fts(conversions_fts, rowid, input, output)
    VALUES ('delete', old.id, old.input, old.output);
END;

-- On UPDATE (delete old, insert new)
CREATE TRIGGER conversions_au AFTER UPDATE ON conversions BEGIN
  INSERT INTO conversions_fts(conversions_fts, rowid, input, output)
    VALUES ('delete', old.id, old.input, old.output);
  INSERT INTO conversions_fts(rowid, input, output) VALUES (new.id, new.input, new.output);
END;
```
Write a DB integrity test that inserts a record, searches FTS5, and asserts a match.

**Warning signs:**
- History search returns no results for text you just converted
- FTS5 query returns results for records that have been deleted
- Rust panics with "no active transaction" when inserting via trigger

**Phase to address:**
Phase 1 (MVP) — schema is set in the first milestone. Add the triggers and an integration test immediately alongside `CREATE VIRTUAL TABLE`.

---

### Pitfall 3: Always-on-Top Breaks on macOS Full-Screen Spaces

**What goes wrong:**
The floating window appears on the wrong macOS Space (desktop) when the user is in a full-screen application. The shortcut (Cmd+Shift+R) shows the window on a non-full-screen desktop, not in front of the current full-screen app.

**Why it happens:**
macOS treats full-screen apps as separate Spaces. `setAlwaysOnTop` does not override Space-level z-ordering. `visibleOnAllWorkspaces` helps but still fails for full-screen windows unless the activation policy is changed.

The workaround — `app.set_activation_policy(tauri::ActivationPolicy::Accessory)` — removes the app from the Dock, which may be acceptable for a floating tool but must be a deliberate decision.

**How to avoid:**
Set `activation_policy: Accessory` intentionally in `main.rs` during setup. Document this as a known behavior change (no Dock icon). Additionally, set `visible_on_all_workspaces(true)` on the window after creation. Test specifically against a full-screen terminal or browser.

**Warning signs:**
- Global hotkey fires but window is not visible on the active Space
- Works in `tauri dev` but breaks in the packaged build
- Window appears behind full-screen apps after using the hotkey

**Phase to address:**
Phase 1 (MVP) — Always on Top is an MVP feature. Validate macOS full-screen behavior as an explicit test case before Phase 1 is called done.

---

### Pitfall 4: Transparent + Undecorated Window Behaves Differently on macOS vs Windows

**What goes wrong:**
The window appears correct on one OS and broken on the other. On Windows, `decorations: false` hides only the title bar, leaving a non-transparent client area. On macOS, transparency works in dev but is lost after DMG packaging (`transparent: true` regresses to opaque in the built artifact). The window-state plugin hangs on macOS when `decorations: false`.

**Why it happens:**
The `decorations: false` + `transparent: true` combination is a known inconsistency in Tauri 2 across platforms (confirmed in Tauri issue #12042, #13415, #14822). Windows requires a custom HTML/CSS title bar — there is no native transparent title bar API on Windows. The window-state plugin's `save_window_state()` call blocks indefinitely on macOS when decorations are off.

**How to avoid:**
- Build a custom drag handle in React (`data-tauri-drag-region` attribute) rather than relying on native decorations.
- Do **not** call `save_window_state()` from the window-state plugin directly when `decorations: false` on macOS. Implement manual position persistence: read/write position via `window.outerPosition()` and `window.setPosition()` on app close/open, storing values in SQLite `settings` table.
- Test the packaged artifact (not just `tauri dev`) on both macOS and Windows before Phase 1 is done.

**Warning signs:**
- Window looks correct in dev, opaque in the built `.app`
- App hangs on close on macOS
- Window has visible OS chrome on Windows despite `decorations: false`

**Phase to address:**
Phase 1 (MVP) — window chrome is visible from first launch. Set up both platforms in CI or test manually on both before shipping Phase 1.

---

### Pitfall 5: Global Shortcut Panics or Fires Twice on macOS

**What goes wrong:**
On macOS, the global-shortcut plugin panics on startup with `"failed to initialize plugin 'global-shortcut': No such file or directory (os error 2)"`. Separately, shortcuts fire twice per keypress with `CommandOrControl` modifier combinations.

**Why it happens:**
Plugin initialization order matters. If the global-shortcut plugin is initialized before the window is ready, it can fail on macOS. The double-fire is a known bug (Tauri issue #10025) with `CommandOrControl` on macOS — the shortcut fires once for `Command` and once for the combined modifier.

**How to avoid:**
- Register shortcuts inside the `setup` closure after all plugins are initialized, not in a separate `on_window_event` handler.
- Use `Shift+Alt+R` or test thoroughly if `Cmd+Shift+R` double-fires. Add a debounce (100ms) in the shortcut handler to guard against the double-fire bug.
- On Windows, test conflicts with other apps. Provide a shortcut customization setting (Phase 3 settings screen).

**Warning signs:**
- App crashes immediately on launch on macOS (check stderr for `global-shortcut` panic)
- Conversion triggers twice per hotkey press
- Works in `tauri dev`, fails in the packaged binary

**Phase to address:**
Phase 2 — global hotkey is a Phase 2 feature. Write a macOS-specific smoke test for hotkey registration before calling Phase 2 done.

---

### Pitfall 6: OS Keychain Thread Safety and Cross-Platform Credential Identity

**What goes wrong:**
Concurrent keychain reads (e.g., multiple providers being initialized at startup) cause deadlocks on macOS. On Windows, the Credential Manager requires an explicit non-empty `account` parameter or silently falls back to a default. A missing API key silently returns `None` rather than an error, causing confusing "provider not configured" states.

**Why it happens:**
The `keyring` crate documents that accessing the keychain from multiple threads simultaneously is generally unsafe and can deadlock. The `account` parameter behavior differs per platform: Linux allows empty account; Windows and macOS native backends require explicit non-empty account strings.

**How to avoid:**
- Wrap keychain access behind a single `Mutex<()>` serialization guard in `keychain.rs`. Never call keychain from parallel async tasks.
- Use stable, human-readable account identifiers: `"romaji-memo/{provider_id}"` format. Never use empty strings.
- Distinguish `NotFound` (key not set) from other errors. Surface `NotFound` to the UI as "API key not configured" rather than a generic error.
- Test keychain read/write on both macOS and Windows before Phase 1 ships.

**Warning signs:**
- Startup hangs when multiple providers are enabled simultaneously
- "API key not configured" error immediately after saving the key via Settings
- App works on macOS, fails silently on Windows

**Phase to address:**
Phase 1 (MVP) — API key storage is required from first use.

---

### Pitfall 7: Anthropic Streaming Error After HTTP 200 Is Not Caught

**What goes wrong:**
The conversion silently truncates mid-response or the app displays a partial result without any error message. The user sees incomplete Japanese text with no indication that something went wrong.

**Why it happens:**
Anthropic (and OpenAI-compatible) streaming APIs return `HTTP 200` immediately, then send error payloads as SSE `data:` events mid-stream. Standard HTTP error handling (checking status code) misses these. Rust code that deserializes each SSE chunk directly as a `CompletionChunk` will panic or silently swallow a `{"error": {...}}` JSON object.

**How to avoid:**
Before deserializing each SSE chunk as a content delta, check the raw JSON for an `"error"` key:
```rust
let json: serde_json::Value = serde_json::from_str(&line)?;
if let Some(err) = json.get("error") {
    return Err(ProviderError::ApiError(err.to_string()));
}
let chunk: CompletionChunk = serde_json::from_value(json)?;
```
Additionally, implement exponential backoff for `429` (rate limit) errors with the `retry-after` header value as the minimum wait. Propagate errors through the channel so the frontend can display a toast.

**Warning signs:**
- Conversion sometimes returns half a sentence with no error shown
- Log shows `serde_json` deserialization errors during streaming
- Rate-limit errors appear as silent failures rather than user-facing messages

**Phase to address:**
Phase 1 (MVP) — core conversion reliability. Add a test with a mock server that sends a mid-stream error event.

---

### Pitfall 8: GitHub Copilot Device Flow Blocks the UI Thread

**What goes wrong:**
The app freezes for 30–60 seconds during Copilot OAuth. The user sees no progress indicator. After the flow completes (or times out), the user has no idea whether they authenticated successfully.

**Why it happens:**
Device Flow OAuth requires: (1) POST to get device code, (2) display code to user, (3) poll for token. If polling is done synchronously in the Rust command handler, it blocks the entire Tauri thread pool slot. If the polling loop runs for the full timeout (default 900 seconds), the command appears to hang.

**How to avoid:**
- Implement Device Flow as a multi-step interaction, not a single blocking command:
  1. `start_copilot_auth()` → returns `{device_code, user_code, verification_uri}` immediately.
  2. Frontend displays the code and opens the browser.
  3. `poll_copilot_auth(device_code)` polls in a background Tokio task, emitting a Tauri event when complete or errored.
- Set an explicit poll timeout (5 minutes max) and surface a timeout error to the UI.
- Store the resulting token in the OS Keychain, not in memory or config.

**Warning signs:**
- Settings screen freezes when "Connect Copilot" is clicked
- No visual progress during auth flow
- Token survives app restart (keychain is working) — if not, token storage is missing

**Phase to address:**
Phase 2 — CopilotAdapter is a Phase 2 feature.

---

### Pitfall 9: Tauri CSP Blocks Localhost AI Providers

**What goes wrong:**
Requests to Ollama (`http://localhost:11434`) or LM Studio (`http://localhost:1234`) succeed in `tauri dev` but are blocked in the packaged app with a Content Security Policy error in the WebView console.

**Why it happens:**
This only applies if HTTP calls are made from the **frontend** (e.g., `fetch()` from React). Tauri's WebView enforces CSP on all frontend-initiated requests. The design correctly places all HTTP calls in Rust (`reqwest`), which bypasses CSP entirely. The pitfall arises if a developer shortcuts this by calling the AI API from a React `useEffect` to "just make it work quickly."

**How to avoid:**
- Enforce the architecture: all external HTTP in Rust only. Never `fetch()` AI endpoints from React.
- If CSP additions are ever needed (e.g., for a future WebSocket), add explicit `connect-src` entries in `tauri.conf.json`'s `security.csp` for each origin.

**Warning signs:**
- Network errors in browser devtools that are absent from the Rust logs
- Requests succeed in `tauri dev` but fail in the packaged binary
- CSP violation errors in the WebView console

**Phase to address:**
Phase 1 (MVP) — enforce architecture from day one in code review.

---

### Pitfall 10: Zustand State Out of Sync with Rust After Command Errors

**What goes wrong:**
After a failed conversion, the UI shows a loading spinner that never resolves, or the history list shows a record that doesn't exist in the database. Refreshing the window fixes it, but the user has no idea what happened.

**Why it happens:**
Optimistic UI updates (writing to Zustand before the `invoke` resolves) are not rolled back on error. Alternatively, the command error is swallowed (`.catch()` without handler, or Rust returning `Ok(())` when it should return `Err`).

**How to avoid:**
- Never update Zustand history or buffer state until the Rust command returns `Ok`.
- Define a single `AppError` type in Rust that implements `serde::Serialize` (wrap `anyhow::Error` or use `thiserror`). Never `map_err(|e| e.to_string())` at the boundary — this loses error codes needed for frontend routing.
- In React: always handle the `invoke` rejection. Show toast on error. If the error is recoverable (rate limit), show retry UI.

**Warning signs:**
- Spinner persists after the backend logs show the command completed
- History count in UI differs from `SELECT COUNT(*) FROM conversions`
- TypeScript `invoke` calls without `.catch()` in the codebase

**Phase to address:**
Phase 1 (MVP) — establish the error handling contract before any UI is built on top.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| `map_err(\|e\| e.to_string())` on all Rust errors | Quick to write | Frontend cannot distinguish error types; no retry logic possible | Never — use `thiserror` AppError from day one |
| Storing API keys in SQLite `settings` table instead of Keychain | Simpler code | Security violation; keys exposed in plain text on disk | Never |
| Single `tokio::sync::Mutex<Connection>` for all DB ops | Simple to implement | Serializes all queries; FTS5 search blocks history writes | Acceptable for MVP scale (local desktop app, low concurrency) |
| `invoke` return type `Result<(), String>` | Quick to implement | Frontend cannot parse structured errors | Never after MVP |
| Hardcoded base URLs for Ollama/LM Studio | Works for dev | Users cannot change ports; blocks teams with custom setups | Never — make configurable from Phase 1 |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Anthropic SSE | Check HTTP status only for errors | Parse every SSE chunk JSON for `"error"` key before processing as content |
| OpenAI-compatible (Ollama/LM Studio) | Assume same error format as Anthropic | Treat each adapter independently; Ollama may return different error shapes |
| OpenRouter | Ignore `X-RateLimit-*` headers | Read `retry-after` and implement exponential backoff; OpenRouter rate limits per model |
| GitHub Copilot Device Flow | Single blocking `invoke` for the whole auth loop | Split into `start_auth` + async polling with Tauri events |
| OS Keychain (keyring crate) | Call from multiple async tasks in parallel | Serialize all keychain access through a single `Mutex<()>` |
| SQLite FTS5 (rusqlite) | Create `conversions_fts` without triggers on `conversions` | Create all 3 triggers (INSERT/UPDATE/DELETE) in the same migration transaction |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Tauri IPC for large payloads (Windows) | 200ms+ latency for history loads | Keep IPC payloads small; paginate history (50 records max per call) | Windows: payloads >1MB; macOS: payloads >10MB |
| FTS5 `MATCH` without index on `pinned` | History panel slow when sorting pinned first | Ensure `idx_conversions_pinned` index exists; profile with `EXPLAIN QUERY PLAN` | >500 records |
| Holding `std::sync::Mutex` guard across `.await` | Deadlock under concurrent convert + history reads | Use `tokio::sync::Mutex` for guards held across await points, or restructure to drop guard before awaiting | First concurrent usage |
| No PRAGMA settings at DB open | Slow writes under sequential usage | Set `PRAGMA journal_mode=WAL` and `PRAGMA synchronous=NORMAL` at connection open | Write-heavy bursts (clipboard monitor mode) |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Writing API key to `settings` table, config file, or `localStorage` | Key exposed in plain text to any process reading app data dir | Keychain only. The config file stores `"<encrypted>"` placeholder. Enforce in code review. |
| Logging the full prompt including potentially sensitive user text | Logs exfiltrated by other processes or in crash reports | Never log `input` or `output` fields at INFO level; use DEBUG with explicit opt-in |
| Using `tokio::fs` to write a temp file with API key for subprocess | Temp file readable by other users on multi-user macOS | Never write secrets to disk in any form |
| Accepting arbitrary `base_url` from config without validation | SSRF if user is tricked into using a malicious `base_url` (low risk for internal tool) | Validate `base_url` parses as HTTP/HTTPS and is a valid URL before using |
| macOS Keychain ACL prompt confuses users | User denies access, app silently loses key | On first keychain write, test read-back immediately and show a clear "Access granted" confirmation |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No streaming feedback — full response appears after latency | Feels broken; users abandon before result appears | Stream tokens via Channel; show skeleton then fill in |
| Generic "Error" toast with no actionable info | User does not know if it is a config issue, rate limit, or network error | Error types: `RateLimit` → "Wait Xs, retry?", `NotConfigured` → "Open Settings", `NetworkError` → "Check connection" |
| Global hotkey conflicts with other apps (no customization) | App unusable for users who have conflicts | Allow hotkey customization in Settings; default `Cmd+Shift+R` is commonly claimed |
| Floating window steals focus on activation | Interrupts typing in another app | Use `accept_first_mouse: false` where possible; show window without stealing keyboard focus |
| History panel opens and closes with every conversion | Workflow interruption | Make history a persistent side panel, not a modal drawer triggered on each save |
| Always-on-top obscures context in full-screen app | Users can't see what they are converting text from | Provide easy "minimize to mini mode" or toggle always-on-top from the window chrome |

---

## "Looks Done But Isn't" Checklist

- [ ] **Streaming:** Verify tokens arrive progressively in the **packaged binary** (not just `tauri dev`) on both macOS and Windows.
- [ ] **FTS5 sync:** Insert a record, search for it, delete it, verify it no longer appears in search — all via the packaged app.
- [ ] **Keychain round-trip:** Save an API key in Settings, quit the app, relaunch, verify the key is pre-filled and conversion works.
- [ ] **Always on Top + full-screen:** Open a full-screen app, trigger Cmd+Shift+R, verify the floating window appears on the correct Space.
- [ ] **Error propagation:** Kill Ollama mid-conversion; verify the UI shows an error toast (not a silent hang).
- [ ] **Transparent window in package:** Build the `.app` / `.exe`, verify transparency is intact and no OS title bar appears.
- [ ] **FTS5 triggers:** After editing a conversion's `output` (future feature), verify search returns the updated text.
- [ ] **Copilot token refresh:** After token expiry, verify re-auth flow triggers automatically without crashing.
- [ ] **Rate limit handling:** Confirm 429 responses show a user-facing message with retry timing, not a generic error.
- [ ] **Windows CI:** At least one full test run on a Windows 10+ machine before each phase ships.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Streaming was command-based, needs Channel refactor | HIGH | Redesign `convert` command signature, update `useConvert.ts`, update Zustand slice. 1-2 days. |
| FTS5 triggers missing, index corrupt | MEDIUM | Add triggers in a new migration; run `INSERT INTO conversions_fts(conversions_fts) VALUES('rebuild')` to rebuild index. Test. |
| Window state plugin hanging on macOS | LOW | Remove `tauri-plugin-window-state`; implement manual position save in SQLite `settings` table. 2-4 hours. |
| API key stored in config (security incident) | HIGH | Migrate keys to Keychain on next launch via migration code; overwrite config file; notify team to re-enter keys. |
| Global shortcut double-fires | LOW | Add 100ms debounce guard in the Rust handler. 30 minutes. |
| Copilot auth blocks UI | MEDIUM | Refactor to two-step command pattern with async polling. 4-8 hours. |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| AI streaming buffered (no real-time feedback) | Phase 1 | Token arrives within 200ms of first chunk in packaged build |
| FTS5 sync triggers missing / corrupt | Phase 1 | FTS integration test: insert → search → delete → search asserts empty |
| Always-on-top breaks on macOS full-screen | Phase 1 | Manual test: full-screen Safari + hotkey → window visible |
| Transparent window regression in packaged build | Phase 1 | Visual check of `.app` and `.exe` artifact before phase sign-off |
| OS Keychain thread safety / identity | Phase 1 | Keychain round-trip test; two providers enabled simultaneously at startup |
| Mid-stream error not caught (Anthropic/OpenAI SSE) | Phase 1 | Mock server test sending `{"error":…}` after first token |
| Zustand out of sync after command error | Phase 1 | Simulate Rust `Err` return; assert UI shows toast and state unchanged |
| CSP blocks localhost providers | Phase 1 | Architecture review: zero `fetch()` calls to AI providers from React |
| Global shortcut panic / double-fire on macOS | Phase 2 | macOS smoke test: hotkey registration without crash, fires once |
| GitHub Copilot Device Flow blocks UI | Phase 2 | Settings screen remains responsive during auth; timeout error shown after 5 min |

---

## Sources

- Tauri GitHub Issues: [#9439 setAlwaysOnTop](https://github.com/tauri-apps/tauri/issues/9439), [#11488 visibleOnAllWorkspaces full-screen](https://github.com/tauri-apps/tauri/issues/11488), [#10025 global shortcut fires twice](https://github.com/tauri-apps/tauri/issues/10025), [#12042 decorations false inconsistency](https://github.com/tauri-apps/tauri/issues/12042), [#13415 transparent regression in DMG](https://github.com/tauri-apps/tauri/issues/13415), [#14822 window-state hang decorations false](https://github.com/tauri-apps/tauri/issues/14822)
- Tauri Plugin Issues: [#2540 global-shortcut panic](https://github.com/tauri-apps/plugins-workspace/issues/2540), [#3240 window-state hang crash](https://github.com/tauri-apps/plugins-workspace/issues/3240)
- Tauri Official Docs: [Calling Frontend (channels)](https://v2.tauri.app/develop/calling-frontend/), [State Management](https://v2.tauri.app/develop/state-management/), [CSP](https://v2.tauri.app/security/csp/), [Global Shortcut Plugin](https://v2.tauri.app/plugin/global-shortcut/), [Window State Plugin](https://v2.tauri.app/plugin/window-state/)
- Anthropic Docs: [Rate Limits](https://platform.claude.com/docs/en/api/rate-limits), [Errors / SSE mid-stream](https://docs.anthropic.com/en/api/errors)
- OpenAI Community: [Mid-stream error handling best practices](https://community.openai.com/t/best-practices-for-handling-mid-stream-errors-responses-api/1370883)
- keyring crate: [docs.rs](https://docs.rs/keyring), [GitHub](https://github.com/hwchen/keyring-rs) — thread safety and platform behavior differences
- SQLite Forum: [FTS5 trigger corruption](https://sqlite.org/forum/info/da59bf102d7a7951740bd01c4942b1119512a82bfa1b11d4f762056c8eb7fc4e), [VTables and triggers](https://sqlite.org/forum/info/c8eaba48ca846155ab6396c0cbd8d215ac6cce83e6c11ffe87485eb25e9542e9)
- Tauri IPC performance discussion: [#11915](https://github.com/orgs/tauri-apps/discussions/11915)
- DEV.to: [Tauri v2 + React 19 AI desktop app (2026)](https://dev.to/purpledoubled/how-i-built-a-desktop-ai-app-with-tauri-v2-react-19-in-2026-1g47)
- Tauri error handling: [Discussion #5008](https://github.com/orgs/tauri-apps/discussions/5008), [Discussion #6952](https://github.com/orgs/tauri-apps/discussions/6952)

---
*Pitfalls research for: Tauri 2 + React desktop app with AI conversion (Romaji Memo)*
*Researched: 2026-04-05*
