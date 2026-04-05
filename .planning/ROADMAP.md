# Roadmap: Romaji Memo

## Overview

Romaji Memo ships in three phases. Phase 1 builds the complete end-to-end conversion loop — the product's core promise — along with all load-bearing infrastructure (DB, Keychain, Provider trait, streaming channels). Phase 2 turns it into a frictionless daily driver by adding history power features, the draft buffer, global hotkey, and provider management. Phase 3 delivers power-user writing modes (long-document accumulation with export, clipboard watch, mini-mode). Every phase produces something the team can install and use.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Core Conversion Loop** - Working floating utility: romaji in, AI output, one-click copy, persistent history, two providers, OS Keychain, always-on-top
- [ ] **Phase 2: Daily Driver Polish** - Global hotkey, history search/pin, draft buffer, custom styles, Copilot adapter, full settings UI, window persistence
- [ ] **Phase 3: Power-User Modes** - Long-document mode with export, clipboard watch, mini-mode, history management settings

## Phase Details

### Phase 1: Core Conversion Loop
**Goal**: Team members can install and use the app to convert romaji to Japanese/English, copy results, and have their history persist across sessions
**Depends on**: Nothing (first phase)
**Requirements**: CONV-01, CONV-02, CONV-03, CONV-04, CONV-05, CONV-06, HIST-01, HIST-02, HIST-03, PROV-01, PROV-02, PROV-04, PROV-07, WINX-01, WINX-03, WINX-04, PLAT-01, PLAT-02, PLAT-03, PLAT-04
**Success Criteria** (what must be TRUE):
  1. User can type romaji (including space-free continuous input like `korehadouda`) and receive correctly segmented Japanese/English output with the AI's intent and any typo corrections displayed
  2. User can select any of the 8 built-in style presets and receive output in that style
  3. User can copy a conversion result to the clipboard with a single click
  4. User's conversion history persists after app restart and can be browsed and re-loaded into the input field
  5. App launches under 3 seconds, uses under 200MB memory, works on macOS 12+ and Windows 10+, and API keys are stored exclusively in OS Keychain
**Plans**: 8 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffold + Tauri config + all dependencies
- [x] 01-02-PLAN.md — SQLite DB module with migration, AppState, CRUD functions
- [x] 01-03-PLAN.md — Keychain module + ProviderAdapter trait + Anthropic/OpenAI adapters + prompt assembly
- [x] 01-04-PLAN.md — Tauri commands (convert, history, providers, window) + provider init wiring
- [x] 01-05-PLAN.md — App shell: TitleBar, theme toggle, window persistence, invoke wrappers
- [x] 01-06-PLAN.md — Converter UI: textarea, style selector, result display, copy button
- [x] 01-07-PLAN.md — History bottom drawer with window resize
- [x] 01-08-PLAN.md — README + end-to-end human verification

**UI hint**: yes

### Phase 2: Daily Driver Polish
**Goal**: Users can invoke the app from anywhere via hotkey, find past conversions instantly, compose multi-paragraph work without losing prior results, and manage their provider settings
**Depends on**: Phase 1
**Requirements**: CONV-07, HIST-04, HIST-05, HIST-06, HIST-07, HIST-08, BUFF-01, BUFF-02, BUFF-03, BUFF-04, PROV-03, PROV-05, PROV-06, PROV-08, WINX-02
**Success Criteria** (what must be TRUE):
  1. User can show/hide the app with Cmd/Ctrl+Shift+R without switching to the app manually
  2. User can search history by keyword and filter by style, and pin frequently used conversions so they stay at the top
  3. User can stock multiple converted texts in a draft buffer, reorder and delete items, and copy all items at once
  4. User can create, edit, and delete custom conversion styles and use them just like built-in presets
  5. User can configure any supported provider (Anthropic, OpenAI-compatible, Copilot), test connectivity, and switch providers from the UI — with Ollama/LM Studio working fully offline
**Plans**: 7 plans

Plans:
- [ ] 02-01-PLAN.md — Rust backend: deps, global shortcut, FTS5 trigram, history/style/provider commands
- [ ] 02-02-PLAN.md — Frontend contracts: invoke wrappers, bufferStore, hooks extensions
- [ ] 02-03-PLAN.md — HistoryDrawer UI: search, style filter, pin, delete
- [ ] 02-04-PLAN.md — DraftBuffer panel with @dnd-kit sortable + ResultDisplay "add to buffer"
- [ ] 02-05-PLAN.md — SettingsDialog shell + ProviderSettings tab + TitleBar gear icon
- [ ] 02-06-PLAN.md — StyleManager tab + HistorySettings tab + StyleSelector custom style integration
- [ ] 02-07-PLAN.md — GitHub Copilot adapter (experimental) + end-to-end verification

**UI hint**: yes

### Phase 3: Power-User Modes
**Goal**: Users can convert long documents paragraph-by-paragraph with accumulated results they can export, auto-import text from clipboard, and minimize the app to an input-only view
**Depends on**: Phase 2
**Requirements**: CONV-08, WINX-05, WINX-06
**Success Criteria** (what must be TRUE):
  1. User can switch to long-document mode, convert text paragraph-by-paragraph, see all accumulated results, and export the full document as .md or .txt
  2. User can enable clipboard watch mode and have text copied elsewhere automatically appear in the input field
  3. User can switch to mini-mode showing only the input field, then return to full view
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Conversion Loop | 8/8 | Complete | - |
| 2. Daily Driver Polish | 0/7 | Planned | - |
| 3. Power-User Modes | 0/? | Not started | - |
