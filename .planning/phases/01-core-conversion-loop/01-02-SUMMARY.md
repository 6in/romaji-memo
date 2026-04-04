---
phase: 01-core-conversion-loop
plan: 02
subsystem: database
tags: [rusqlite, sqlite, fts5, wal, migrations, appstate, tauri]

# Dependency graph
requires:
  - phase: 01-core-conversion-loop
    plan: 01
    provides: "Tauri 2 scaffold with rusqlite 0.39 (bundled) in Cargo.toml"
provides:
  - SQLite DB opened with WAL mode + PRAGMA synchronous=NORMAL + foreign_keys=ON
  - MIGRATION_001: conversions, custom_styles, settings tables + 3 indexes + FTS5 virtual table + 3 triggers (ai/ad/au)
  - PRAGMA user_version migration versioning (idempotent re-run safe)
  - ConversionRecord struct with insert_conversion + get_history (paginated, style filter)
  - get_setting / set_setting with INSERT OR REPLACE
  - AppState struct with Arc<Mutex<Connection>>, RwLock<providers>, Mutex<keychain_lock>
  - AppState registered with Tauri managed state via setup hook
  - ProviderAdapter trait stub (Plan 04 fills out)
affects: [03, 04, 05, 06, 07, 08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DB opened in Tauri setup hook via app.path().app_data_dir() (requires tauri::Manager in scope)"
    - "Mutex<Connection> wrapped in Arc for cloning into spawn_blocking closures"
    - "FTS5 content table uses all 3 triggers (ai/ad/au) — missing any causes silent index corruption"
    - "PRAGMA user_version for migration versioning — check version then run migration then set version"
    - "All SQL uses rusqlite::params![] macro — never string concatenation (SQL injection prevention)"

key-files:
  created:
    - src-tauri/src/db/mod.rs
    - src-tauri/src/db/migrations.rs
    - src-tauri/src/db/conversions.rs
    - src-tauri/src/db/settings.rs
    - src-tauri/src/providers/mod.rs
    - src-tauri/src/state.rs
  modified:
    - src-tauri/src/lib.rs

key-decisions:
  - "tauri::Manager must be imported explicitly for app.path() and app.manage() to be accessible in setup hook"
  - "ProviderAdapter stub created in providers/mod.rs so state.rs compiles before Plan 04 implements adapters"
  - "db/conversions.rs and db/settings.rs written in full during Task 1 (not Task 2) because mod.rs declares them and they must exist for cargo check to pass"

patterns-established:
  - "Pattern 4: DB access via Arc<Mutex<Connection>> in AppState — clone Arc into spawn_blocking for all DB calls"
  - "Pattern 5: FTS5 content tables require all 3 triggers created in the same migration — never add them separately"
  - "Pattern 6: Tauri setup hook is the correct place to resolve app_data_dir and initialize long-lived state"

requirements-completed: [HIST-01]

# Metrics
duration: 8min
completed: 2026-04-05
---

# Phase 1 Plan 02: SQLite DB Layer Summary

**rusqlite 0.39 database with WAL mode, FTS5 full-text search (3 triggers), migration versioning via PRAGMA user_version, and AppState holding Arc<Mutex<Connection>> registered with Tauri managed state**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-04T17:30:47Z
- **Completed:** 2026-04-04T17:38:00Z
- **Tasks:** 2 (committed together — see deviation note)
- **Files modified:** 1 modified, 6 created

## Accomplishments

- DB opens `romaji-memo.db` in the OS app data directory with WAL + NORMAL + foreign_keys PRAGMAs
- MIGRATION_001 creates all 3 tables (conversions, custom_styles, settings), 3 indexes, FTS5 virtual table, and all 3 triggers (conversions_ai, conversions_ad, conversions_au)
- Migration is idempotent: uses `PRAGMA user_version` to skip if already applied
- `insert_conversion` and `get_history` (paginated with optional style filter) use `params![]` throughout
- `get_setting` / `set_setting` with `INSERT OR REPLACE` use `params![]` throughout
- AppState with `Arc<Mutex<Connection>>` registered via `app.manage()` in Tauri setup hook
- `cargo check` passes clean (only expected dead_code warnings for functions not yet called by commands)

## Task Commits

1. **Tasks 1 + 2: DB module, migration, conversions, settings, AppState** - `bb79599` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src-tauri/src/db/mod.rs` - open_db with WAL/NORMAL/foreign_keys PRAGMAs + run_migrations using PRAGMA user_version
- `src-tauri/src/db/migrations.rs` - MIGRATION_001 const with all tables, indexes, FTS5 virtual table, and 3 triggers
- `src-tauri/src/db/conversions.rs` - ConversionRecord struct + insert_conversion + get_history (paginated, style_filter)
- `src-tauri/src/db/settings.rs` - get_setting + set_setting with INSERT OR REPLACE
- `src-tauri/src/providers/mod.rs` - ProviderAdapter trait stub (Plan 04 implements)
- `src-tauri/src/state.rs` - AppState with Arc<Mutex<Connection>>, RwLock<providers>, Mutex<keychain_lock>
- `src-tauri/src/lib.rs` - Tauri setup hook: resolves app_data_dir, opens DB, constructs AppState, registers via app.manage()

## Decisions Made

- `tauri::Manager` must be brought into scope explicitly for `app.path()` and `app.manage()` to be accessible — the compiler error message is clear but easy to miss
- Created `ProviderAdapter` stub in `providers/mod.rs` so `state.rs` compiles without requiring Plan 04's full adapter implementations
- Wrote full implementations for `conversions.rs` and `settings.rs` during Task 1 instead of stubs, because `db/mod.rs` declares `pub mod conversions; pub mod settings;` and cargo requires these files to exist with valid Rust

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added tauri::Manager import to lib.rs**
- **Found during:** Task 1 (cargo check)
- **Issue:** `app.path()` and `app.manage()` require `tauri::Manager` to be in scope; without the import, the compiler returns "no method named manage/path found"
- **Fix:** Added `use tauri::Manager;` to lib.rs
- **Files modified:** src-tauri/src/lib.rs
- **Verification:** cargo check exits 0
- **Committed in:** bb79599

**2. [Rule 3 - Blocking] Created providers/mod.rs stub so state.rs compiles**
- **Found during:** Task 1 (cargo check after creating state.rs)
- **Issue:** state.rs references `crate::providers::ProviderAdapter` which requires a `providers` module to exist; without it, cargo fails with "file not found for module"
- **Fix:** Created `src-tauri/src/providers/mod.rs` with minimal `pub trait ProviderAdapter: Send + Sync {}` stub
- **Files modified:** src-tauri/src/providers/mod.rs (created)
- **Verification:** cargo check exits 0
- **Committed in:** bb79599

**3. [Rule 3 - Blocking] Wrote full Task 2 implementations during Task 1 compilation**
- **Found during:** Task 1 (cargo check)
- **Issue:** `db/mod.rs` declares `pub mod conversions; pub mod settings;` which requires the files to exist at compile time; without them, cargo fails with "file not found for module"
- **Fix:** Created full implementations (not stubs) for both files since they were needed immediately
- **Files modified:** src-tauri/src/db/conversions.rs, src-tauri/src/db/settings.rs (created)
- **Verification:** cargo check exits 0
- **Committed in:** bb79599

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All fixes required for compilation. No scope creep. Tasks 1 and 2 were committed together because Task 2's files were required for Task 1's cargo check to pass.

## Issues Encountered

None beyond the compilation fixes documented above.

## User Setup Required

None — DB is created automatically in the OS app data directory on first launch.

## Next Phase Readiness

- Plan 03 (keyring/settings commands) can proceed — AppState with `keychain_lock: Mutex<()>` is ready
- Plan 04 (AI providers) can proceed — ProviderAdapter trait stub in providers/mod.rs is the right extension point
- Plan 05+ (UI) can proceed — settings table and conversion history table are ready for Tauri commands to expose
- All DB access patterns are established: Arc<Mutex<Connection>> cloned into spawn_blocking for async safety

---
*Phase: 01-core-conversion-loop*
*Completed: 2026-04-05*
