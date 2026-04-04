---
phase: 01-core-conversion-loop
plan: 07
subsystem: history-drawer
tags: [react, zustand, tanstack-query, tauri-window, history, drawer]

# Dependency graph
requires:
  - phase: 01-core-conversion-loop
    plan: 05
    provides: "App shell with TitleBar, theme toggle, window persistence"
  - phase: 01-core-conversion-loop
    plan: 06
    provides: "Converter UI with conversionStore (setInput, setSelectedStyleId) and BUILT_IN_STYLES"
provides:
  - src/store/historyStore.ts: Zustand store for drawer open/close state
  - src/hooks/useHistory.ts: TanStack Query hook wrapping getHistory with lazy load
  - src/components/HistoryDrawer.tsx: Bottom drawer with window resize, scrollable history list, click-to-reload
  - src/App.tsx: Updated to include HistoryDrawer below main content
affects: [08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy TanStack Query: enabled prop on useHistory prevents fetch until drawer opens"
    - "Window resize on drawer toggle via getCurrentWindow().setSize() with Math.max(targetHeight, MIN_HEIGHT) guard"
    - "queryClient.invalidateQueries on drawer open to get fresh history data each time"
    - "outerSize() used to preserve current window width when resizing height"

key-files:
  created:
    - src/store/historyStore.ts
    - src/hooks/useHistory.ts
    - src/components/HistoryDrawer.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "MIN_HEIGHT=400 guard prevents sub-400px window on any platform (RESEARCH.md Q3 — Windows setSize minimum)"
  - "DRAWER_HEIGHT=280, BASE_HEIGHT=600 — target height is 880px when open; minimum enforced at 400px"
  - "overflow-y-auto on main (was overflow-hidden) so Converter content remains scrollable when drawer is open"

# Metrics
duration: 3min
completed: 2026-04-05
---

# Phase 1 Plan 07: History Bottom Drawer Summary

**History bottom drawer with Zustand open/close store, lazy TanStack Query hook, window resize on toggle, scrollable history list with style/preview/timestamp, and click-to-reload input**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-04T20:26:51Z
- **Completed:** 2026-04-04T20:29:55Z
- **Tasks:** 1
- **Files modified:** 1 modified, 3 created

## Accomplishments

- `src/store/historyStore.ts`: Zustand 5 store with `isDrawerOpen: false`, `toggleDrawer`, `setDrawerOpen` actions
- `src/hooks/useHistory.ts`: TanStack Query hook wrapping `getHistory(50, 0)` — `enabled` prop means no fetch until drawer opens; `staleTime: 30_000` refreshes after 30s
- `src/components/HistoryDrawer.tsx`:
  - D-12: `useEffect` on `isDrawerOpen` calls `getCurrentWindow().setSize(new LogicalSize(width, targetHeight))` where `targetHeight = Math.max(BASE_HEIGHT + DRAWER_HEIGHT, MIN_HEIGHT)` when open, `Math.max(BASE_HEIGHT, MIN_HEIGHT)` when closed
  - MIN_HEIGHT=400 guard prevents window below usable size on any platform
  - D-14: scrollable list showing style label (via `BUILT_IN_STYLES` lookup), `item.output` preview, `formatTime(item.createdAt)` timestamp
  - D-13: `handleItemClick` calls `setInput(item.input)` and `setSelectedStyleId(item.styleId)`
  - Empty state: "履歴がありません" when no records
  - Loading state: "Loading..." while fetching
  - `queryClient.invalidateQueries({ queryKey: ['history'] })` on open to get fresh data
- `src/App.tsx`: Added `<HistoryDrawer />` below `<main>` inside the flex column; changed `overflow-hidden` to `overflow-y-auto` on main
- TypeScript compiles with 0 errors (verified after `npm install`)

## Task Commits

1. **Task 1: history drawer with window resize, store, and hook** — `278b891` (feat)

## Files Created/Modified

- `src/store/historyStore.ts` — HistoryState interface; useHistoryStore with isDrawerOpen/toggleDrawer/setDrawerOpen
- `src/hooks/useHistory.ts` — useHistory TanStack Query hook with enabled/staleTime
- `src/components/HistoryDrawer.tsx` — HistoryDrawer component with D-12/D-13/D-14 behavior
- `src/App.tsx` — HistoryDrawer import and placement; main overflow fix

## Decisions Made

- MIN_HEIGHT=400 guard: RESEARCH.md Q3 notes Windows has minimum window size constraints; `Math.max()` ensures we never go below 400px on any platform
- Changed `overflow-hidden` to `overflow-y-auto` on main: the original `overflow-hidden` would clip Converter content when window is tall; `overflow-y-auto` is correct for a flex child with `flex-1`
- npm install was run in worktree to enable TypeScript verification (deps were not yet installed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Changed overflow-hidden to overflow-y-auto on main element**
- **Found during:** Task 1 (reviewing App.tsx update)
- **Issue:** Plan specified `<main className="flex-1 overflow-y-auto">` but existing App.tsx had `overflow-hidden`; the plan's target layout is correct — overflow-y-auto allows Converter content to scroll if needed
- **Fix:** Changed `overflow-hidden` to `overflow-y-auto` as specified in the plan's action step 4
- **Files modified:** src/App.tsx
- **Commit:** 278b891

**2. [Rule 3 - Blocking] Installed npm dependencies to enable TypeScript verification**
- **Found during:** Task 1 verification
- **Issue:** `node_modules` not present in worktree; `npx tsc --noEmit` showed all "Cannot find module" errors (pre-existing, not from new code)
- **Fix:** Ran `npm install --prefer-offline` in the worktree; all module resolution errors resolved; TypeScript compiled with 0 errors
- **Files modified:** node_modules/ (gitignored)
- **Commit:** N/A (gitignored)

## Known Stubs

None — all components are fully wired. History data comes from `get_history` Tauri command (implemented in Plan 04). The drawer will show "履歴がありません" until actual conversions are made.

## Threat Surface

| Threat ID | Status |
|-----------|--------|
| T-01-16 | Accepted — history is user's own conversion data displayed locally; no external exposure |

No new trust boundaries introduced beyond the plan's threat model.

## Self-Check: PASSED

- src/store/historyStore.ts: FOUND
- src/hooks/useHistory.ts: FOUND
- src/components/HistoryDrawer.tsx: FOUND
- src/App.tsx: FOUND (HistoryDrawer added)
- Commit 278b891: FOUND
- TypeScript: PASSED (0 errors after npm install)
