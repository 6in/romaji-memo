---
phase: 01-core-conversion-loop
plan: 05
subsystem: frontend-shell
tags: [tauri2, react, typescript, zustand, tanstack-query, tailwind, theme, window-persistence, titlebar]

# Dependency graph
requires:
  - phase: 01-core-conversion-loop
    plan: 04
    provides: "All 6 Tauri commands (convert, get_history, list_providers, toggle_always_on_top, save_window_state, get_window_state)"
provides:
  - "src/lib/tauri.ts: typed invoke wrappers for all 6 Tauri commands"
  - "src/store/settingsStore.ts: Zustand 5 settings store (theme, alwaysOnTop, activeProviderId)"
  - "src/components/TitleBar.tsx: custom title bar with drag region, pin, theme toggle, minimize, close"
  - "src/App.tsx: app shell with theme sync, window state persistence, QueryClientProvider, Toaster"
affects: [06, 07, 08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All Tauri invoke calls routed through src/lib/tauri.ts — components never import @tauri-apps/api directly"
    - "Zustand 5 store with typed interface for settings state"
    - "data-theme attribute on <html> element controls CSS variable switching (D-15)"
    - "Debounced 500ms window state save on onMoved/onResized events"
    - "debounce typed with generic T extends (...args: Parameters<T>) => ReturnType<T> for strict TypeScript compliance"

key-files:
  created:
    - src/lib/tauri.ts
    - src/store/settingsStore.ts
    - src/components/TitleBar.tsx
  modified:
    - src/App.tsx

key-decisions:
  - "debounce typed with Parameters<T>/ReturnType<T> generics instead of any[] for strict TypeScript compliance"
  - "TitleBar imports getCurrentWindow from @tauri-apps/api/window directly (window API is UI-layer, not IPC data) — only data commands go through lib/tauri.ts"

patterns-established:
  - "Pattern 11: All Tauri IPC data commands go through src/lib/tauri.ts wrappers; window/DPI API imports are acceptable in components"

requirements-completed: [WINX-01, WINX-03, WINX-04]

# Metrics
duration: 15min
completed: 2026-04-05
---

# Phase 1 Plan 05: App Shell with TitleBar, Theme Toggle, and Window Persistence Summary

**Custom chrome-less app shell with typed IPC wrappers, Zustand settings store, drag-region title bar with always-on-top pin and dark/light theme toggle, and debounced window geometry persistence**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-04-05
- **Tasks:** 2
- **Files modified:** 1 modified, 3 created

## Accomplishments

- `src/lib/tauri.ts`: all 6 Tauri commands typed and exported (`convertText`, `getHistory`, `listProviders`, `toggleAlwaysOnTop`, `saveWindowState`, `getWindowState`); components never import from `@tauri-apps/api/core` directly
- `src/store/settingsStore.ts`: Zustand 5 store with `theme` (dark default), `alwaysOnTop` (true default), `activeProviderId` ('anthropic' default), `toggleTheme` action
- `src/components/TitleBar.tsx`: `data-tauri-drag-region` on outer div and title span; pin icon with filled/unfilled state for always-on-top; Sun/Moon icons for theme toggle; Minus and X for minimize/close
- `src/App.tsx`: `data-theme` attribute applied to `document.documentElement` on theme change; window state restored via `getWindowState()` on mount; debounced 500ms save via `onMoved`/`onResized`; `QueryClientProvider` and Sonner `Toaster` integrated
- TypeScript compiles with 0 errors

## Task Commits

1. **Task 1: Create typed invoke wrappers and settings store** - `af48fbd` (feat)
2. **Task 2: Create TitleBar component and App shell with theme + window persistence** - `10911c3` (feat)

## Files Created/Modified

- `src/lib/tauri.ts` — ConvertResult, ConversionRecord, ProviderInfo, WindowState interfaces; all 6 invoke wrappers
- `src/store/settingsStore.ts` — SettingsState interface; useSettingsStore with dark/alwaysOnTop/anthropic defaults
- `src/components/TitleBar.tsx` — drag handle, pin toggle (D-18), Sun/Moon theme toggle (D-15), minimize/close
- `src/App.tsx` — theme sync to html root, window restore on mount, debounced save on move/resize, QueryClient, Toaster

## Decisions Made

- Used `Parameters<T>` / `ReturnType<T>` generics in `debounce` instead of `any[]` for full TypeScript strict-mode compliance — cleaner than the plan's `(...args: any[]) => any` signature
- `TitleBar` imports `getCurrentWindow` from `@tauri-apps/api/window` directly — this is the Tauri window management API (not IPC data), so it is acceptable in UI components; the lib/tauri.ts boundary is for data commands

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Typed debounce with Parameters/ReturnType instead of any[]**
- **Found during:** Task 2
- **Issue:** Plan used `(...args: any[]) => any` in debounce signature which violates TypeScript strict mode; the project targets strict TypeScript compliance
- **Fix:** Changed debounce type parameter to `T extends (...args: Parameters<T>) => ReturnType<T>` for full type safety
- **Files modified:** src/App.tsx
- **Commit:** 10911c3

---

**Total deviations:** 1 auto-fixed (type safety improvement)
**Impact on plan:** No behavior change. Strictly better TypeScript typing.

## Known Stubs

The placeholder `<div className="p-4 text-sm text-muted-foreground">Ready. Converter UI coming in next plan.</div>` inside `<main>` is intentional — the Converter component is implemented in Plan 06. The app shell is complete; only the inner content is placeholder by design.

## Threat Surface

| Threat ID | Status |
|-----------|--------|
| T-01-12 | Mitigated — no API keys or secrets cross IPC boundary; lib/tauri.ts only exposes style_id, input text, provider_id |
| T-01-13 | Accepted — window position is non-sensitive local preference data |

## Next Phase Readiness

- Plans 06 and 07 (Converter UI, History panel) can import from `src/lib/tauri.ts` and `src/store/settingsStore.ts`
- `useSettingsStore` provides `activeProviderId` for Plan 06's converter invocation
- Theme system is active — all subsequent components get dark/light theming automatically via CSS variables

---
*Phase: 01-core-conversion-loop*
*Completed: 2026-04-05*

## Self-Check: PASSED

- src/lib/tauri.ts: FOUND
- src/store/settingsStore.ts: FOUND
- src/components/TitleBar.tsx: FOUND
- src/App.tsx: FOUND
- Commit af48fbd: FOUND
- Commit 10911c3: FOUND
- TypeScript: 0 errors
