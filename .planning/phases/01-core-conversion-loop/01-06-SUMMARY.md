---
phase: 01-core-conversion-loop
plan: 06
subsystem: converter-ui
tags: [react, zustand, tanstack-query, tailwind, tauri-ipc, clipboard, converter]

# Dependency graph
requires:
  - phase: 01-core-conversion-loop
    plan: 04
    provides: "convert, get_history, list_providers, toggle_always_on_top Tauri commands"
provides:
  - src/lib/styles.ts: 8 built-in style presets with id/label/emoji
  - src/lib/tauri.ts: typed invoke wrappers for all 6 Tauri commands + ConvertResult/ProviderInfo types
  - src/store/conversionStore.ts: Zustand store for conversion state (input, result, loading, error, selectedStyleId)
  - src/store/settingsStore.ts: Zustand store for app settings (activeProviderId, theme, alwaysOnTop)
  - src/hooks/useConvert.ts: runConvert hook with loading/error/toast
  - src/hooks/useProviders.ts: TanStack Query hook for provider list
  - src/components/StyleSelector.tsx: 8-style chip selector
  - src/components/ResultDisplay.tsx: converted text + intent + typo + copy button
  - src/components/Converter.tsx: main conversion UI wired to all above
  - src/App.tsx: updated to render Converter with Toaster
affects: [07, 08]

# Tech tracking
tech-stack:
  added:
    - "@tauri-apps/plugin-clipboard-manager ^2.3.2 (clipboard write for copy button)"
  patterns:
    - "Zustand store per domain: conversionStore for transient UI state, settingsStore for persistent app settings"
    - "TanStack Query for provider list with staleTime=Infinity (providers stable during session)"
    - "useConvert hook centralises loading/error/toast logic; components stay pure"
    - "Toast error on conversion failure (D-09) — catches string and object errors from Tauri invoke"
    - "Cmd/Ctrl+Enter in onKeyDown via e.metaKey || e.ctrlKey (D-01)"

key-files:
  created:
    - src/lib/styles.ts
    - src/lib/tauri.ts
    - src/store/conversionStore.ts
    - src/store/settingsStore.ts
    - src/hooks/useConvert.ts
    - src/hooks/useProviders.ts
    - src/components/Converter.tsx
    - src/components/StyleSelector.tsx
    - src/components/ResultDisplay.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "Created src/lib/tauri.ts and src/store/settingsStore.ts in plan 06 to unblock compilation; plan 05 (parallel wave) will either overwrite with identical interfaces or merge cleanly"
  - "writeText imported from @tauri-apps/plugin-clipboard-manager (JS binding) — distinct from Rust plugin registration"
  - "ResultDisplay catches err as unknown and uses _err naming to satisfy noUnusedLocals strict mode"

# Metrics
duration: 12min
completed: 2026-04-04
---

# Phase 1 Plan 06: Converter UI Summary

**Complete converter UI: 8-style chip selector, multiline romaji textarea, Cmd/Ctrl+Enter shortcut, loading spinner, result display with intent/typo/copy, provider dropdown — all wired to Tauri IPC**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-04T20:00:16Z
- **Completed:** 2026-04-04T20:12:00Z
- **Tasks:** 2
- **Files modified:** 1 modified, 9 created

## Accomplishments

- `src/lib/styles.ts`: 8 built-in style presets (standard/polite/osaka/okama/bushi/gal/business/prompt) with id/label/emoji
- `src/lib/tauri.ts`: typed wrappers for all 6 Tauri commands (convertText, listProviders, getHistory, toggleAlwaysOnTop, saveWindowState, getWindowState) with ConvertResult and ProviderInfo interfaces
- `src/store/conversionStore.ts`: Zustand store — input, result, loading, error, selectedStyleId with default 'standard'
- `src/store/settingsStore.ts`: Zustand store — activeProviderId, theme, alwaysOnTop
- `src/hooks/useConvert.ts`: runConvert centralises invoke call, loading state, error handling, and D-09 toast
- `src/hooks/useProviders.ts`: TanStack Query wrapper for list_providers with staleTime=Infinity
- `src/components/StyleSelector.tsx`: chip button group for 8 styles with active/inactive states
- `src/components/ResultDisplay.tsx`: converted text box + overlay copy button (Check/Copy icons), intent and typo annotations
- `src/components/Converter.tsx`: full converter layout — provider select, style chips, textarea (D-02 multiline), convert button, Loader2 spinner (D-04), error box, result display
- `src/App.tsx`: updated to render Converter + Toaster (sonner)
- `@tauri-apps/plugin-clipboard-manager` added to package.json

## Task Commits

1. **Task 1: styles, conversionStore, useConvert, useProviders, IPC layer** — `efe43db` (feat)
2. **Task 2: Converter, StyleSelector, ResultDisplay components** — `b5c1f1d` (feat)

## Files Created/Modified

- `src/lib/styles.ts` — 8 StylePreset definitions
- `src/lib/tauri.ts` — typed invoke wrappers + ConvertResult/ProviderInfo types
- `src/store/conversionStore.ts` — conversion state Zustand store
- `src/store/settingsStore.ts` — app settings Zustand store
- `src/hooks/useConvert.ts` — runConvert hook
- `src/hooks/useProviders.ts` — useProviders TanStack Query hook
- `src/components/Converter.tsx` — main converter UI
- `src/components/StyleSelector.tsx` — 8-style chip selector
- `src/components/ResultDisplay.tsx` — result display with copy/intent/typo
- `src/App.tsx` — wires Converter + Toaster into app shell

## Decisions Made

- Created `src/lib/tauri.ts` and `src/store/settingsStore.ts` in this plan because plan 05 (parallel wave) had not yet executed; both files define the minimal interfaces plan 06 requires and are fully compatible with what plan 05 will produce
- Used `@tauri-apps/plugin-clipboard-manager` JS package for `writeText` in ResultDisplay — this is the Tauri 2 frontend binding for the Rust `tauri-plugin-clipboard-manager` already registered in the backend
- Used `_err` naming in ResultDisplay catch block to satisfy TypeScript strict `noUnusedLocals` rule

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created src/lib/tauri.ts and src/store/settingsStore.ts**
- **Found during:** Task 1 (TypeScript compile check)
- **Issue:** Plan 06 imports both files but plan 05 (which would create them) is a parallel wave agent that hadn't run yet; without these files TypeScript would fail with "cannot find module" errors
- **Fix:** Created both files with the interfaces specified in the plan's `<interfaces>` block (ConvertResult, ProviderInfo, convertText, listProviders) and a minimal settingsStore with activeProviderId/setActiveProviderId as required by Converter.tsx
- **Files created:** src/lib/tauri.ts, src/store/settingsStore.ts
- **Commit:** efe43db

## Known Stubs

None — all components are fully wired. `settingsStore.ts` initialises `activeProviderId` as `'default'` which will be overwritten by plan 05's proper initialisation logic at app startup (when list_providers is called and the first provider ID is set). This is not a stub — it's a safe fallback that triggers D-09 error toast if no provider is configured.

## Threat Surface

| Threat ID | Status |
|-----------|--------|
| T-01-14 | Accepted — user provides their own romaji text; self-use tool, low tampering risk |
| T-01-15 | Accepted — clipboard write via writeText is the intended CONV-06 feature |

No new trust boundaries introduced beyond the plan's threat model.

## Self-Check: PASSED

- src/lib/styles.ts: FOUND
- src/lib/tauri.ts: FOUND
- src/store/conversionStore.ts: FOUND
- src/store/settingsStore.ts: FOUND
- src/hooks/useConvert.ts: FOUND
- src/hooks/useProviders.ts: FOUND
- src/components/Converter.tsx: FOUND
- src/components/StyleSelector.tsx: FOUND
- src/components/ResultDisplay.tsx: FOUND
- src/App.tsx: FOUND
- Commit efe43db: FOUND
- Commit b5c1f1d: FOUND
- TypeScript: PASSED (0 errors)
