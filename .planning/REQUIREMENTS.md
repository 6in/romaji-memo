# Requirements: Romaji Memo

**Defined:** 2026-04-05
**Core Value:** ローマ字をタイプするだけで、スペースなし連続入力でも文脈からAIが正しく日本語・英語に変換し、ワンクリックでコピーできること。

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Core Conversion

- [ ] **CONV-01**: User can input romaji text and receive AI-converted Japanese/English output
- [ ] **CONV-02**: User can select conversion style from 8 built-in presets (標準/丁寧/大阪弁/おかま/武士/ギャル/ビジネス/AIプロンプト)
- [ ] **CONV-03**: User can input continuous romaji without spaces and receive correctly segmented output (e.g., `korehadouda` → 「これはどうだ」)
- [ ] **CONV-04**: User can see AI's interpretation of their input (intent display)
- [ ] **CONV-05**: User can see typo/mistype corrections applied by the AI
- [ ] **CONV-06**: User can copy conversion result to clipboard with one click
- [ ] **CONV-07**: User can create, edit, and delete custom conversion styles
- [ ] **CONV-08**: User can convert text paragraph-by-paragraph in long-document mode, accumulate results, and export to .md/.txt

### History

- [ ] **HIST-01**: User's conversion history is persistently stored in SQLite
- [ ] **HIST-02**: User can browse conversion history in a scrollable list
- [ ] **HIST-03**: User can click a history item to reload it into the input field
- [ ] **HIST-04**: User can search history by keyword (full-text search)
- [ ] **HIST-05**: User can filter history by style
- [ ] **HIST-06**: User can pin frequently used conversions to the top
- [ ] **HIST-07**: User can delete individual history items
- [ ] **HIST-08**: User can set a history count limit (default 1000)

### Draft Buffer

- [ ] **BUFF-01**: User can stock multiple converted texts in a draft buffer
- [ ] **BUFF-02**: User can reorder items in the draft buffer
- [ ] **BUFF-03**: User can delete individual items from the draft buffer
- [ ] **BUFF-04**: User can copy all buffer items at once

### Providers

- [ ] **PROV-01**: User can use Anthropic API (Claude) as conversion provider
- [ ] **PROV-02**: User can use OpenAI-compatible APIs (OpenAI/Ollama/OpenRouter/LM Studio) as conversion provider
- [ ] **PROV-03**: User can use GitHub Copilot as conversion provider via Device Flow OAuth
- [ ] **PROV-04**: User can switch between providers from the UI
- [ ] **PROV-05**: User can configure provider settings (API key, base URL, model) in a settings screen
- [ ] **PROV-06**: User can test provider connectivity from the settings screen
- [ ] **PROV-07**: API keys are stored exclusively in OS Keychain (never in config files or localStorage)
- [ ] **PROV-08**: User can use Ollama/LM Studio fully offline

### Window & UX

- [ ] **WINX-01**: User can toggle Always on Top mode
- [ ] **WINX-02**: User can show/hide the app via global hotkey (Cmd/Ctrl+Shift+R)
- [ ] **WINX-03**: Window position and size are remembered across restarts
- [ ] **WINX-04**: User can switch between dark and light themes (dark-green theme as default)
- [ ] **WINX-05**: User can switch to mini-mode (input-only minimal view)
- [ ] **WINX-06**: User can enable clipboard watch mode (auto-import copied text into input)

### Platform

- [ ] **PLAT-01**: App launches in under 3 seconds
- [ ] **PLAT-02**: App uses less than 200MB memory
- [ ] **PLAT-03**: App works on macOS 12+
- [ ] **PLAT-04**: App works on Windows 10+

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Notifications
- **NOTF-01**: User receives notification when long-document export completes

### Data Management
- **DATA-01**: User can export conversion history as CSV/JSON

## Out of Scope

| Feature | Reason |
|---------|--------|
| Screenshot capture + OCR | User decision: not needed |
| Mobile app | Desktop-first; Tauri 2 does not target mobile |
| Real-time chat interface | Diverges from tool identity (conversion utility, not chatbot) |
| Auto-paste into active app | Requires Accessibility permissions; wrong-window accidents |
| Cloud sync of history | Requires backend infrastructure; local utility |
| Real-time per-keystroke streaming | LLM latency makes it impractical; wastes tokens |
| Grammar checker / proofreading | Conflates two AI tasks; conversion already implies correction |
| Collaboration / team sharing | Transforms local utility into SaaS; out of scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONV-01 | Phase 1 | Pending |
| CONV-02 | Phase 1 | Pending |
| CONV-03 | Phase 1 | Pending |
| CONV-04 | Phase 1 | Pending |
| CONV-05 | Phase 1 | Pending |
| CONV-06 | Phase 1 | Pending |
| CONV-07 | Phase 2 | Pending |
| CONV-08 | Phase 3 | Pending |
| HIST-01 | Phase 1 | Pending |
| HIST-02 | Phase 1 | Pending |
| HIST-03 | Phase 1 | Pending |
| HIST-04 | Phase 2 | Pending |
| HIST-05 | Phase 2 | Pending |
| HIST-06 | Phase 2 | Pending |
| HIST-07 | Phase 2 | Pending |
| HIST-08 | Phase 2 | Pending |
| BUFF-01 | Phase 2 | Pending |
| BUFF-02 | Phase 2 | Pending |
| BUFF-03 | Phase 2 | Pending |
| BUFF-04 | Phase 2 | Pending |
| PROV-01 | Phase 1 | Pending |
| PROV-02 | Phase 1 | Pending |
| PROV-03 | Phase 2 | Pending |
| PROV-04 | Phase 1 | Pending |
| PROV-05 | Phase 2 | Pending |
| PROV-06 | Phase 2 | Pending |
| PROV-07 | Phase 1 | Pending |
| PROV-08 | Phase 2 | Pending |
| WINX-01 | Phase 1 | Pending |
| WINX-02 | Phase 2 | Pending |
| WINX-03 | Phase 1 | Pending |
| WINX-04 | Phase 1 | Pending |
| WINX-05 | Phase 3 | Pending |
| WINX-06 | Phase 3 | Pending |
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |
| PLAT-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 38 total
- Mapped to phases: 38
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after roadmap creation*
