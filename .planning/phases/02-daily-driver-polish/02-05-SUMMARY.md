---
phase: 02-daily-driver-polish
plan: "05"
subsystem: ui
tags: [react, shadcn, sheet, tabs, settings, provider-management, tauri]

requires:
  - phase: 02-daily-driver-polish
    plan: "02"
    provides: useProviders hooks, ProviderConfig types, tauri IPC wrappers

provides:
  - SettingsDialog (Sheet + 3-tab structure) at src/components/settings/SettingsDialog.tsx
  - ProviderSettings tab with full CRUD at src/components/settings/ProviderSettings.tsx
  - shadcn Sheet/Tabs/Input components at src/components/ui/
  - TitleBar gear icon that opens settings panel

affects:
  - 02-06 (StyleManager will be placed in "styles" tab placeholder)
  - 02-07 (HistorySettings will be placed in "general" tab placeholder)

tech-stack:
  added:
    - "@base-ui/react/dialog (via shadcn Sheet)"
    - "@base-ui/react/tabs (via shadcn Tabs)"
    - "shadcn Input component"
  patterns:
    - "SheetTrigger uses render prop (render={<button />}) not asChild — base-ui pattern"
    - "TabsContent value prop required (base-ui Panel.Props)"
    - "Provider CRUD: inline edit form, confirmation on delete, ping mutation for connection test"
    - "API key: password input, empty string -> null (preserve existing Keychain value)"

key-files:
  created:
    - src/components/settings/SettingsDialog.tsx
    - src/components/settings/ProviderSettings.tsx
    - src/components/ui/sheet.tsx
    - src/components/ui/tabs.tsx
    - src/components/ui/input.tsx
  modified:
    - src/components/TitleBar.tsx

key-decisions:
  - "SheetTrigger asChild not supported by base-ui; use render prop pattern instead"
  - "Empty API key field sends null to preserve existing Keychain key (not overwrite)"
  - "isAdding state + editingId together distinguish new-provider form from edit form"

patterns-established:
  - "base-ui components use render prop, not asChild — apply to all future shadcn Dialog/Sheet usage"
  - "Inline confirmation for destructive actions (no modal) — consistent with UI-SPEC"

requirements-completed:
  - PROV-05
  - PROV-06
  - PROV-08

duration: 20min
completed: 2026-04-05
---

# Phase 02 Plan 05: Settings Dialog + Provider Settings Summary

**shadcn Sheet/Tabs-based settings dialog with full provider CRUD, connection testing, and TitleBar gear icon using base-ui render-prop pattern**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-05T10:08:00Z
- **Completed:** 2026-04-05T10:28:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- TitleBar にギアアイコンを追加し、クリックで右スライドイン設定シートが開く
- 3 タブ構造 (プロバイダー/スタイル/全般) の SettingsDialog シェル完成
- ProviderSettings タブ: カードリスト表示、インライン編集、接続テスト (ping)、アクティブドット、追加/削除

## Task Commits

1. **Task 1: shadcn Sheet/Tabs/Input + SettingsDialog シェル** - `54afb71` (feat)
2. **Task 2: ProviderSettings + TitleBar ギアアイコン** - `c1707e0` (feat)

## Files Created/Modified

- `src/components/settings/SettingsDialog.tsx` - Sheet + 3-tab root component
- `src/components/settings/ProviderSettings.tsx` - Provider CRUD tab (add/edit/delete/ping)
- `src/components/ui/sheet.tsx` - shadcn Sheet (base-ui Dialog based)
- `src/components/ui/tabs.tsx` - shadcn Tabs (base-ui Tabs based)
- `src/components/ui/input.tsx` - shadcn Input
- `src/components/TitleBar.tsx` - Added SettingsDialog gear icon import and usage

## Decisions Made

- **SheetTrigger render prop**: base-ui の SheetTrigger は `asChild` をサポートしない。代わりに `render={<button />}` を使用。
- **API キー空文字 → null**: 編集フォームで API キーを空のまま保存した場合、`null` を送信して既存の Keychain キーを保持する。
- **isAdding + editingId**: 新規追加フォームと既存編集フォームを区別するために両フラグを組み合わせる。

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn Input コンポーネントの追加**
- **Found during:** Task 1 (SettingsDialog 作成後、ProviderSettings のフォームフィールド用)
- **Issue:** プランに Input の追加が明示されていなかったが、ProviderSettings の `<Input>` 使用に必要
- **Fix:** `npx shadcn@latest add input` で追加
- **Files modified:** src/components/ui/input.tsx (新規)
- **Verification:** TypeScript コンパイル成功
- **Committed in:** 54afb71 (Task 1 commit)

**2. [Rule 1 - Bug] SheetTrigger asChild → render prop に変更**
- **Found during:** Task 1 (TypeScript コンパイルエラー)
- **Issue:** `asChild` は base-ui コンポーネントに存在しない。`Property 'asChild' does not exist`
- **Fix:** `<SheetTrigger render={<button />}>` パターンに変更
- **Files modified:** src/components/settings/SettingsDialog.tsx
- **Verification:** TypeScript コンパイル成功
- **Committed in:** 54afb71 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** 両方とも動作に必須の修正。スコープ変更なし。

## Known Stubs

| File | Content | Reason |
|------|---------|--------|
| src/components/settings/SettingsDialog.tsx | "スタイル設定は準備中..." | Plan 06 で StyleManager を配置予定 |
| src/components/settings/SettingsDialog.tsx | "全般設定は準備中..." | Plan 06/07 で HistorySettings を配置予定 |

スタブはプレースホルダーとして意図的。Plan 06 で解消される。

## Issues Encountered

- ファイルを worktree ではなくメインリポジトリに誤作成。shadcn CLI を worktree ルートで再実行して解決。

## Next Phase Readiness

- SettingsDialog シェルが完成し、Plan 06 でスタイル/全般タブのコンテンツを追加できる状態
- ProviderSettings が完全機能しており、プロバイダーの追加・編集・削除・接続テストが可能
- TitleBar のギアアイコンからシートが開く

## Threat Surface Scan

T-02-12, T-02-13, T-02-14 (プランの threat_model) を実装確認:
- T-02-12: API キーは `type="password"` で表示、`<encrypted>` は空表示 — 実装済み
- T-02-13: ユーザー指定 URL のみに ping — 実装済み (Rust 側 5秒タイムアウトは Plan 01 で済み)
- T-02-14: upsert 時に空 API キーを null 送信して既存 Keychain キーを保護 — 実装済み

追加の threat surface なし。

## Self-Check

- [x] src/components/settings/SettingsDialog.tsx — 作成済み
- [x] src/components/settings/ProviderSettings.tsx — 作成済み
- [x] src/components/ui/sheet.tsx — 作成済み
- [x] src/components/ui/tabs.tsx — 作成済み
- [x] src/components/ui/input.tsx — 作成済み
- [x] src/components/TitleBar.tsx — SettingsDialog import + 使用済み
- [x] コミット 54afb71 — 存在確認済み
- [x] コミット c1707e0 — 存在確認済み
- [x] npx tsc --noEmit — パス

## Self-Check: PASSED

---
*Phase: 02-daily-driver-polish*
*Completed: 2026-04-05*
