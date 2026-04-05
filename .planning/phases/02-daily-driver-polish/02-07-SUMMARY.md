---
phase: 02-daily-driver-polish
plan: "07"
subsystem: providers
tags: [rust, copilot, oauth, device-flow, react, settings-ui]

requires:
  - phase: 02-daily-driver-polish
    plan: "01"
    provides: ProviderAdapter trait, keychain functions, lib.rs setup structure
  - phase: 02-daily-driver-polish
    plan: "05"
    provides: ProviderSettings component, tauri.ts invoke wrappers

provides:
  - CopilotAdapter (ProviderAdapter impl) at src-tauri/src/providers/copilot.rs
  - start_copilot_auth / poll_copilot_auth Tauri commands
  - Device Flow OAuth UI in ProviderSettings
  - Copilot (実験的) label + ToS warning

affects:
  - lib.rs (copilot match arm added to provider initialization)

tech-stack:
  added: []
  patterns:
    - "Device Flow: URL-encoded body via reqwest .body() + Content-Type header (reqwest form feature not available)"
    - "Copilot token: two-step auth — OAuth token (Keychain) → Copilot session token (per-request)"
    - "pollCopilotAuth runs async in background, updates UI via state callbacks"

key-files:
  created:
    - src-tauri/src/providers/copilot.rs
  modified:
    - src-tauri/src/providers/mod.rs
    - src-tauri/src/lib.rs
    - src-tauri/src/commands/providers.rs
    - src/lib/tauri.ts
    - src/components/settings/ProviderSettings.tsx

key-decisions:
  - "reqwest form feature not in Cargo.toml — used manual URL-encoded body string instead of .form()"
  - "poll_copilot_auth runs as detached async task in frontend (fire-and-forget) — UI updates via state"
  - "Copilot adapter only initialized at startup if OAuth token exists in Keychain"

patterns-established:
  - "URL-encoded form body: format!(\"key={}&key2={}\", val1, val2) + Content-Type header"

requirements-completed:
  - PROV-03

duration: 30min
completed: 2026-04-05
---

# Phase 02 Plan 07: Copilot (実験的) Adapter Summary

**CopilotAdapter (Device Flow OAuth + Chat Completions) + ProviderSettings UI with experimental label and ToS warning**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-05T10:17:00Z
- **Completed:** 2026-04-05T10:47:00Z
- **Tasks:** 3 of 3 complete (Task 3 = human verification — PASSED)
- **Files modified:** 5

## Accomplishments

- `src-tauri/src/providers/copilot.rs` 新規作成: CopilotAdapter (ProviderAdapter impl), start_device_flow(), poll_for_token()
- `providers/mod.rs` に `pub mod copilot` 追加
- `lib.rs` に `"copilot"` match アーム追加 + start_copilot_auth/poll_copilot_auth コマンド登録
- `commands/providers.rs` に start_copilot_auth, poll_copilot_auth コマンド追加
- `src/lib/tauri.ts` に DeviceCodeResponse 型 + startCopilotAuth/pollCopilotAuth 追加
- ProviderSettings に Copilot Device Flow 認証 UI + 実験的ラベル + ToS 警告文

## Task Commits

1. **Task 1: CopilotAdapter + Tauri コマンド** - `b6d48b7` (feat)
2. **Task 2: Copilot 認証 UI + 実験的ラベル** - `783f9a4` (feat)

## Files Created/Modified

- `src-tauri/src/providers/copilot.rs` - CopilotAdapter, start_device_flow(), poll_for_token()
- `src-tauri/src/providers/mod.rs` - pub mod copilot 追加
- `src-tauri/src/lib.rs` - copilot match アーム + コマンド登録
- `src-tauri/src/commands/providers.rs` - start_copilot_auth, poll_copilot_auth
- `src/lib/tauri.ts` - DeviceCodeResponse, startCopilotAuth, pollCopilotAuth
- `src/components/settings/ProviderSettings.tsx` - Copilot Device Flow UI

## Decisions Made

- **reqwest form feature 未使用**: Cargo.toml に `form` feature がないため、`.form()` の代わりに `format!()` で URL-encoded body を手動構築 + `Content-Type: application/x-www-form-urlencoded` ヘッダーを手動設定。
- **pollCopilotAuth の非同期処理**: フロントエンドでは `pollCopilotAuth()` を fire-and-forget で呼び出し、`.then()/.catch()` で状態を更新する。Tauri コマンド側でブロッキングループを実行。
- **Copilot アダプター初期化**: 起動時に OAuth token が Keychain にある場合のみアダプターを初期化。ない場合は設定 UI から Device Flow を開始する必要がある。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] reqwest .form() メソッド非対応**
- **Found during:** Task 1 (cargo build でコンパイルエラー)
- **Issue:** プランのコードサンプルが `.form(&[...])` を使用していたが、Cargo.toml の reqwest features に `form` が含まれていないため `no method named 'form' found` エラー
- **Fix:** `format!()` で URL-encoded body 文字列を構築し、`.body()` + `Content-Type: application/x-www-form-urlencoded` ヘッダーで代替
- **Files modified:** src-tauri/src/providers/copilot.rs
- **Commit:** b6d48b7

**2. [Rule 1 - Bug] 型推論エラー (E0282)**
- **Found during:** Task 1 (同 cargo build)
- **Issue:** `resp.json().await` で型アノテーションが不足し `cannot infer type` エラー
- **Fix:** 各 `.json::<TypeName>()` に明示的な型アノテーションを追加
- **Files modified:** src-tauri/src/providers/copilot.rs
- **Commit:** b6d48b7

## Threat Surface Scan

T-02-18 (OAuth token Keychain 保存) — 実装確認:
- poll_copilot_auth コマンドがトークンを OS Keychain に保存 (`set_api_key` 経由)
- フロントエンドにトークンを返さない (Rust 側で完結)
- providers.json には `<encrypted>` のみ保存

T-02-19 (ToS 警告) — 実装確認:
- ProviderSettings に「GitHub の利用規約に抵触する可能性があります。自己責任でご利用ください。」警告文
- 「Copilot (実験的)」ラベルをアダプター select と カードヘッダーに表示
- ユーザーが能動的に「GitHub で認証」ボタンを押す必要がある

## Known Stubs

なし。

## Self-Check

- [x] src-tauri/src/providers/copilot.rs — 作成済み
- [x] copilot.rs に `impl ProviderAdapter for CopilotAdapter` — 含まれている
- [x] copilot.rs に `pub async fn start_device_flow(` — 含まれている
- [x] copilot.rs に `pub async fn poll_for_token(` — 含まれている
- [x] copilot.rs に `COPILOT_CHAT_URL` 定数 — 含まれている
- [x] providers/mod.rs に `pub mod copilot` — 追加済み
- [x] lib.rs に `"copilot"` match アーム — 追加済み
- [x] commands/providers.rs に `start_copilot_auth` — 追加済み
- [x] commands/providers.rs に `poll_copilot_auth` — 追加済み
- [x] tauri.ts に `export interface DeviceCodeResponse` — 追加済み
- [x] tauri.ts に `export async function startCopilotAuth(` — 追加済み
- [x] tauri.ts に `export async function pollCopilotAuth(` — 追加済み
- [x] ProviderSettings.tsx に `startCopilotAuth` import — 追加済み
- [x] ProviderSettings.tsx に `自己責任でご利用ください` 警告 — 含まれている
- [x] ProviderSettings.tsx に `GitHub で認証` ボタン — 含まれている
- [x] ProviderSettings.tsx に `(実験的)` サフィックス — 含まれている
- [x] cargo build 成功 — 確認済み (b6d48b7)
- [x] npx tsc --noEmit 成功 — 確認済み (783f9a4)

## Self-Check: PASSED

---
*Phase: 02-daily-driver-polish*
*Completed: 2026-04-05*
