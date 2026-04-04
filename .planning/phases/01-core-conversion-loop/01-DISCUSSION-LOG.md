# Phase 1: Core Conversion Loop - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the discussion.

**Date:** 2026-04-05
**Phase:** 01-core-conversion-loop
**Mode:** discuss
**Areas discussed:** 変換トリガー, ストリーミング表示, Phase 1プロバイダー設定, 履歴パネル配置

## Areas Discussed

### 変換トリガー
| Question | Answer |
|----------|--------|
| How to trigger conversion? | Button click OR Cmd/Ctrl+Enter. Enter key = newline only (no special handling). |

**User note (verbatim):** "button to cmd/ctrl + enter de henkan. enter ha tokuni syoriha nasi."

### ストリーミング表示
| Question | Answer |
|----------|--------|
| How to show conversion result? | Spinner during conversion → full result displayed all at once when done. |

No streaming in Phase 1. Tauri Channel API deferred.

### Phase 1 プロバイダー設定
| Question | Answer |
|----------|--------|
| How do users input API key? (Full settings UI is Phase 2) | Manual shell command to add key directly to OS Keychain. |

Follow-up clarification asked about the conflict with PROV-07 (keys must NOT be in config files). User confirmed: use shell commands (`security add-generic-password` on macOS, `cmdkey` on Windows) to populate Keychain directly. README to document setup steps.

### 履歴パネル配置
| Question | Answer |
|----------|--------|
| Where and how to display history? | Bottom drawer, toggled by a "History" button. Window expands vertically when opened. |

## Corrections Made

None — all selected options were accepted without modification.

## Scope Items Deferred

- Streaming output display (Channel API) — deferred to Phase 2 if needed
- Full settings UI — Phase 2 per roadmap
- Global hotkey — Phase 2 per roadmap
