# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-05)

**Core value:** ローマ字をタイプするだけで、スペースなし連続入力でも文脈からAIが正しく日本語・英語に変換し、ワンクリックでコピーできること。
**Current focus:** Phase 1 — Core Conversion Loop

## Current Position

Phase: 1 of 3 (Core Conversion Loop)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-04-05 — Roadmap created, ready to begin Phase 1 planning

Progress: [░░░░░░░░░░] 0%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: -

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Pre-phase]: Use Tauri Channel API (not commands) for AI streaming from day one — retrofitting costs 1-2 days
- [Pre-phase]: Serialize all OS Keychain access behind Mutex from the start — parallel reads deadlock on macOS
- [Pre-phase]: Test packaged binary (not just `tauri dev`) for transparent/undecorated window before Phase 1 sign-off
- [Pre-phase]: FTS5 virtual table needs all three triggers (INSERT/UPDATE/DELETE) created in the initial migration

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 1: Space-free romaji boundary inference depends entirely on prompt design — needs rapid prototyping spike before building full conversion UI
- Phase 1: Windows build must be tested against a real Windows 10+ machine for window chrome and Keychain behaviour
- Phase 2: GitHub Copilot Device Flow OAuth uses undocumented endpoints — needs validation spike before implementation; if blocked, defer to v2

## Session Continuity

Last session: 2026-04-05
Stopped at: Roadmap created, STATE.md initialized
Resume file: None
