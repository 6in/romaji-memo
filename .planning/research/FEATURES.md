# Feature Research

**Domain:** AI-powered romaji text conversion — floating desktop utility
**Researched:** 2026-04-05
**Confidence:** HIGH (project spec well-defined; ecosystem analysis from comparable tools: Superwhisper, BoltAI, Elephas, Paste, clipboard managers)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Romaji input → converted text | Core product promise; any text conversion tool must do this | MEDIUM | Requires AI round-trip + JSON parsing from LLM response |
| One-click copy to clipboard | Floating utility pattern (Superwhisper, PopClip) — copy without friction is the whole point | LOW | Tauri clipboard-manager plugin; must not require focus switching |
| Style selection (preset list) | Users need to choose formal vs casual vs dialect; absence means single-mode rigidity | LOW | Radio/tab group UI; presets baked in as JSON |
| Conversion history (persistent) | All clipboard/conversion tools (Paste, CopyQ, Superwhisper) store history; loss of work = user distrust | MEDIUM | SQLite; conversions table; scroll list in drawer |
| History search / filter | Standard for any list >20 items; clipboard managers (Paste, Ditto) all have this | MEDIUM | SQLite FTS5; style filter + keyword; debounced input |
| Always-on-top toggle | Floating utility contract; without it users must alt-tab away from the app they're writing in | LOW | Tauri `set_always_on_top`; must survive workspace switches |
| Global hotkey to show/hide | Superwhisper (⌥+Space), Raycast (⌘+Space) — instant invocation is table stakes for system utilities | LOW | `tauri-plugin-global-shortcut`; Cmd/Ctrl+Shift+R |
| API key storage (secure) | BoltAI, Elephas both advertise Keychain storage as a feature; users on shared machines will not trust plaintext | MEDIUM | `keyring` crate; OS Keychain on macOS/Windows |
| Provider selection (cloud + local) | Power users demand Ollama/local model option; no single vendor lock-in is now expected | MEDIUM | ProviderAdapter trait; multiple providers behind one interface |
| Error / typo correction feedback | If AI silently mangled input, users cannot trust output; "intent" field surfaces AI interpretation | LOW | Part of LLM JSON response; display alongside converted text |
| Window position/size persistence | All native desktop utilities remember geometry; forgetting feels broken | LOW | SQLite settings table; restore on startup |
| Dark/light theme | Native macOS/Windows apps follow system appearance; forced single theme alienates half of users | LOW | Tailwind `dark:` classes; default dark-green theme |

### Differentiators (Competitive Advantage)

Features that set this product apart. Not required to feel complete, but create real advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Space-free continuous romaji input | No other romaji tool handles `korehadouda` → 「これはどうだ」 without spaces; this is the core technical moat | HIGH | Requires careful prompting — boundary detection must be part of system prompt; main differentiator over standard IME |
| Rich dialect/register styles (8 built-in) | Osaka-ben, gyaru, bushi, business — creative and fun; users in chat/SNS contexts will share/recommend | LOW | Prompt templates in JSON; UI just loops the list |
| Custom style creation | Users define their own persona prompts; personalisation drives retention | MEDIUM | custom_styles table; CRUD UI in settings panel |
| AI "intent" annotation | Shows what the AI understood the input to mean; builds trust in output accuracy; no other romaji tool does this | LOW | Already in LLM response JSON; just render it |
| Draft buffer (multi-item stacking) | Compose multi-paragraph outputs without losing prior conversions; similar to Heynote blocks concept; reduces round-trips to destination app | MEDIUM | In-memory list + UI for reorder/delete/bulk copy |
| Long-document accumulation mode | Paragraph-by-paragraph conversion with final export to .md/.txt; converts Romaji Memo from a snippet tool into a writing tool | HIGH | Separate UI mode; append-only buffer; export via Tauri fs write |
| Clipboard watch mode | Auto-imports clipboard text into input field; useful when converting copied foreign text or reformatting pasted content | MEDIUM | `tauri-plugin-clipboard-manager` polling or event; user-toggled |
| Mini-mode (input-only minimal view) | Superwhisper-style: maximize screen real estate while tool is active; critical for small laptop screens | MEDIUM | Resize window + hide non-essential panels; remember state |
| GitHub Copilot as provider (Device Flow OAuth) | Lets users leverage existing Copilot subscription with zero additional cost; unique among romaji tools | HIGH | Device Flow OAuth flow; token refresh; separate adapter |
| Pinned history items | Superwhisper and Paste both offer pinning; frequent phrases (greetings, sign-offs) should be instant | LOW | `pinned` column in conversions table; sort pinned first |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem appealing but create complexity, maintenance burden, or scope drift.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Screenshot/OCR capture | "Convert text from images" is natural extension | Requires platform-specific screen capture APIs, complex OCR pipeline, privacy concerns; doubles scope; already excluded in PROJECT.md | Out of scope — users can manually paste text from images |
| Real-time streaming conversion (per keystroke) | Feels responsive like a live IME | LLM latency (even local) makes per-keystroke streaming impractical; creates flickering UI and wastes tokens; better to wait for explicit submit | Explicit submit via Enter/button; show spinner during wait |
| Cloud sync of history | Users expect cross-device clipboard sync (Paste app precedent) | Requires backend infrastructure, auth, data residency concerns; all API keys are local; adds significant maintenance | Local SQLite only; if demanded, add later via optional iCloud/file sync |
| Auto-paste into active app (like Superwhisper) | Reduces clicks; feels magical | Requires Accessibility permissions on macOS and elevated permissions on Windows; creates paste-into-wrong-window accidents; hard to debug | One-click copy; user pastes manually — safer and simpler |
| Collaboration / team sharing | Teams want shared style libraries | Adds user accounts, sync, conflict resolution; transforms a local utility into a SaaS product | Ship individually; team distribution is via installer, not cloud accounts |
| Mobile app | Romaji typing exists on mobile IME | Tauri 2 does not target mobile; separate codebase; out of scope in PROJECT.md | Desktop-only; mobile users use system IME |
| Real-time chat interface | "Chat with the AI" is a natural ask from AI-tool users | Diverges from tool identity (conversion utility, not chatbot); ChatGPT, BoltAI already fill this role | Keep the tool single-purpose; resist feature drift |
| Grammar checker / proofreading (on top of conversion) | Users who convert text also want it checked | Conflates two different AI tasks; muddies the conversion prompt; adds latency | Conversion result quality already implies correction; no separate grammar pass needed |
| History export as CSV/JSON for analytics | Power users want data | Low ROI; complicates DB schema evolution | History panel with search is sufficient; defer to v2 if demanded |

---

## Feature Dependencies

```
[Romaji conversion (core)]
    └──requires──> [Provider adapter (at least one)]
                       └──requires──> [API key storage (Keychain)]
    └──requires──> [Style selection]
                       └──enhances──> [Custom style CRUD]

[History display]
    └──requires──> [Romaji conversion (core)]   (needs data to display)
    └──enhances──> [History search / filter]
    └──enhances──> [Pinned items]

[Draft buffer]
    └──requires──> [Romaji conversion (core)]   (receives converted output)
    └──enhances──> [Long-document mode]         (buffer becomes document accumulator)

[Long-document mode]
    └──requires──> [Draft buffer]
    └──requires──> [File export (Tauri fs)]

[Global hotkey]
    └──requires──> [Always-on-top toggle]       (hotkey brings window to front)

[Mini-mode]
    └──enhances──> [Always-on-top toggle]       (smaller footprint while always visible)

[GitHub Copilot adapter]
    └──requires──> [Device Flow OAuth]
    └──requires──> [API key storage (Keychain)]

[Clipboard watch mode]
    └──requires──> [Clipboard manager plugin]
    └──enhances──> [Romaji conversion (core)]   (auto-populates input)

[Custom style CRUD]
    └──requires──> [Style selection UI]
    └──requires──> [SQLite custom_styles table]

[History search]
    └──requires──> [History display]
    └──requires──> [SQLite FTS5 virtual table]
```

### Dependency Notes

- **Provider adapter requires API key storage:** No provider can be configured without a secure place to put credentials. Keychain integration must exist before any provider UI ships.
- **Draft buffer required before long-document mode:** Long-document mode is the draft buffer in accumulation mode — it is not a separate data structure.
- **Global hotkey depends on always-on-top:** Hotkey brings window to foreground; if the window is not always-on-top, it will appear behind full-screen apps and be unusable. These two features ship together.
- **History search requires FTS5:** Standard SQL LIKE query is insufficient for CJK text search. The `conversions_fts` virtual table must be created in the initial migration.
- **Custom styles conflict with style immutability:** Built-in styles must be read-only; only custom styles are editable. UI must distinguish between the two.

---

## MVP Definition

### Launch With (v1 — Phase 1)

Minimum viable to validate the core conversion concept with the team.

- [ ] Romaji input field → conversion via AnthropicAdapter + OpenAIAdapter (Ollama) — validates core value
- [ ] Style preset selection (8 built-in styles) — needed to test style outputs
- [ ] One-click copy — without this, the tool has no usable output
- [ ] AI intent + typo annotation display — trust-building; validates LLM quality
- [ ] Space-free romaji boundary inference — the core differentiator; must validate early
- [ ] Conversion history (SQLite persistent) — needed to iterate on outputs across sessions
- [ ] Always-on-top toggle — without this, the floating utility pattern breaks
- [ ] API key storage via OS Keychain — non-negotiable security; team distribution requires this

### Add After Validation (v1.x — Phase 2)

Add when core conversion loop is confirmed working and used.

- [ ] Global hotkey (Cmd/Ctrl+Shift+R) — reduces friction; add once basic invocation is validated
- [ ] GitHub Copilot adapter (Device Flow OAuth) — high complexity; defer until provider abstraction is stable
- [ ] Draft buffer — add when users report friction in multi-paragraph workflows
- [ ] History search + style filter + pin — add when history grows and discoverability becomes a pain
- [ ] Custom style CRUD — add when users request styles not covered by built-in 8

### Future Consideration (v2+)

Defer until product-market fit and sustained usage is established.

- [ ] Long-document mode with export — high complexity; validate that paragraph-level use case exists
- [ ] Clipboard watch mode — useful but niche; validate demand before adding polling/event complexity
- [ ] Mini-mode — nice UX refinement; defer until window management basics are solid
- [ ] Provider UI management screen (full CRUD) — advanced; Phase 1 can hardcode provider configs
- [ ] History limit configuration — operational detail; default 1000 rows is sufficient for v1

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Romaji → converted output (core) | HIGH | MEDIUM | P1 |
| Space-free boundary inference | HIGH | HIGH | P1 — core differentiator |
| One-click copy | HIGH | LOW | P1 |
| Style preset selection | HIGH | LOW | P1 |
| OS Keychain API key storage | HIGH | MEDIUM | P1 — security non-negotiable |
| Always-on-top toggle | HIGH | LOW | P1 |
| Intent / typo annotation display | MEDIUM | LOW | P1 — trust signal |
| Conversion history (persistent) | HIGH | MEDIUM | P1 |
| Global hotkey | MEDIUM | LOW | P2 |
| History search + FTS5 | MEDIUM | MEDIUM | P2 |
| Pinned history items | MEDIUM | LOW | P2 |
| Draft buffer | MEDIUM | MEDIUM | P2 |
| Custom style CRUD | MEDIUM | MEDIUM | P2 |
| GitHub Copilot adapter | MEDIUM | HIGH | P2 |
| Window size/position persistence | LOW | LOW | P2 |
| Dark/light theme | LOW | LOW | P2 |
| Clipboard watch mode | MEDIUM | MEDIUM | P3 |
| Mini-mode | LOW | MEDIUM | P3 |
| Long-document mode + export | HIGH | HIGH | P3 |
| Cloud sync | LOW | HIGH | Anti-feature — do not build |
| Auto-paste (Accessibility) | LOW | HIGH | Anti-feature — do not build |
| Screenshot OCR | LOW | HIGH | Anti-feature — explicitly excluded |

**Priority key:**
- P1: Must have for launch (Phase 1)
- P2: Should have, add in Phase 2
- P3: Nice to have, Phase 3+

---

## Competitor Feature Analysis

| Feature | Microsoft IME | Superwhisper | BoltAI / Elephas | Romaji Memo (ours) |
|---------|---------------|--------------|------------------|--------------------|
| Input method | Keyboard → kana/kanji (space to convert) | Voice → text | Text prompt → AI response | Romaji → AI converted Japanese/English |
| Space-free input | No (requires explicit space boundary) | N/A | N/A | Yes — core differentiator |
| Style/tone presets | No | Formal/casual/email/message | Arbitrary prompt | 8 built-in dialects + custom |
| Always-on-top floating | No | No (menu bar) | No | Yes |
| Global hotkey | System IME shortcut | Yes (⌥+Space) | Yes | Yes (Cmd/Ctrl+Shift+R) |
| History | Learning-only, not browsable | Yes (transcript history) | Chat history | Yes (SQLite, searchable, pinnable) |
| Local / offline model | No | No (cloud Whisper) | Ollama support | Yes (Ollama, LM Studio) |
| Custom prompt styles | No | Yes (custom modes) | Yes (prompt library) | Yes (custom style CRUD) |
| Draft buffer | No | No | No | Yes — differentiator |
| API key security | N/A (no external API) | N/A | Keychain (macOS) | Keychain (macOS + Windows) |
| Cross-platform | Windows / macOS | macOS only | macOS only | macOS 12+ / Windows 10+ |

---

## Sources

- Superwhisper feature list: https://superwhisper.com/
- BoltAI API key handling: https://docs.boltai.com/blog/how-boltai-handles-your-api-keys
- BoltAI features: https://docs.boltai.com/docs/features
- Paste clipboard manager (pinning, search): https://apps.apple.com/us/app/paste-limitless-clipboard/id967805235
- Clipboard manager best practices 2026: https://textexpander.com/blog/best-clipboard-managers
- Windows clipboard managers 2026: https://windowsnews.ai/article/windows-clipboard-managers-in-2026-ditto-copyq-clipclip-workflow-acceleration-tools.409292
- Heynote scratchpad (draft buffer pattern): https://heynote.com/
- Ollama offline GUI issues: https://github.com/ollama/ollama/issues/11632
- macOS AI clients compared (BoltAI, Elephas, TypingMind): https://blog.apps.deals/2025-04-28-macos-ai-clients-comparison
- Elephas app overview: https://elephas.app
- Raycast floating notes / always-on-top: https://www.raycast.com/changelog/1-69-0
- Tauri global shortcut plugin: https://v2.tauri.app/plugin/global-shortcut/
- Japanese IME Microsoft docs: https://learn.microsoft.com/en-us/globalization/input/japanese-ime

---
*Feature research for: AI-powered romaji text conversion floating desktop utility*
*Researched: 2026-04-05*
