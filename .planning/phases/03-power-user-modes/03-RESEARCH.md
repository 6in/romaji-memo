# Phase 3: Power-User Modes - Research

**Researched:** 2026-04-05
**Domain:** Tauri 2 window management / clipboard monitoring / file export / UI state routing
**Confidence:** HIGH (コアAPIはすべて公式ドキュメントで確認済み)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONV-08 | User can convert text paragraph-by-paragraph in long-document mode, accumulate results, and export to .md/.txt | Long-document UI は既存 DraftBuffer パターンを拡張; エクスポートは tauri-plugin-dialog + tauri-plugin-fs の組み合わせ |
| WINX-05 | User can switch to mini-mode (input-only minimal view) | `getCurrentWindow().setSize(new LogicalSize(...))` + Zustand `isMiniMode` フラグ + UI 条件分岐 |
| WINX-06 | User can enable clipboard watch mode (auto-import copied text into input) | コミュニティ製 `tauri-plugin-clipboard` (CrossCopy) の `startListening` / `onTextUpdate` — 公式プラグインは監視非対応 |
</phase_requirements>

---

## Summary

Phase 3 は 3 つの独立した機能から構成される。いずれも Phase 1/2 で構築済みのインフラ (Zustand ストア・Tauri コマンド・window API) の上に乗せるだけであり、Rust 側の大きな変更は不要。

**長文書モード (CONV-08)** は既存の DraftBuffer をドキュメント蓄積ロールに流用するか、専用の `DocumentStore` を追加する設計になる。エクスポートには 2 つの公式プラグインが必要: `tauri-plugin-dialog`（保存先ダイアログ）と `tauri-plugin-fs`（ファイル書き込み）。どちらも Tauri 公式であり実績十分。

**ミニモード (WINX-05)** は `getCurrentWindow().setSize()` を呼ぶだけで実現できる。Phase 1 で `decorations: false` ウィンドウを使っているが、tao 0.34.8（現在の Cargo.lock 実績値）では undecoratedウィンドウの setSize バグが修正済みであることを CHANGELOG で確認した。ただし macOS と Windows で動作を本番バイナリで検証する必要がある。

**クリップボード監視 (WINX-06)** は公式 `tauri-plugin-clipboard-manager` では対応不可 (read/write のみ)。コミュニティ製 `tauri-plugin-clipboard` (CrossCopy) の `startListening` + `onTextUpdate` を使う必要がある。両プラグインを共存させる際の競合はないが、capabilities の権限追加が必要。

**Primary recommendation:** 公式プラグイン 2 本 (dialog + fs) を追加し、クリップボード監視は CrossCopy プラグインで補完する。ウィンドウ変形は JS API のみで完結する。

---

## Standard Stack

### Core (追加が必要なもの)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tauri-plugin-dialog` | 2.x | 保存先ファイルダイアログ | Tauri 公式プラグイン。`save()` で OS ネイティブ保存ダイアログを表示 |
| `@tauri-apps/plugin-dialog` | 2.x | 上記の JS バインディング | 公式セット |
| `tauri-plugin-fs` | 2.x | ファイル書き込み | Tauri 公式。`writeTextFile()` でテキスト書き出し |
| `@tauri-apps/plugin-fs` | 2.x | 上記の JS バインディング | 公式セット |
| `tauri-plugin-clipboard` | 2.x | クリップボード変更監視 | CrossCopy コミュニティ製。公式プラグインは監視非対応のため必須 |
| `tauri-plugin-clipboard-api` | 2.1.11 | 上記の JS バインディング | npm: `tauri-plugin-clipboard-api` |

### 既存スタック (変更なし)
| Library | Version | Purpose |
|---------|---------|---------|
| Zustand | 5.0.x | 新規 `isMiniMode` / `isDocumentMode` フラグを既存ストアに追加 |
| `@tauri-apps/api/window` | 2.x | `getCurrentWindow().setSize()` でミニモード切替 |
| `@tauri-apps/plugin-clipboard-manager` | 2.3.2 | 既存の writeText は継続使用 |

### 代替案

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `tauri-plugin-fs` (フロントエンドから書き込み) | Rust コマンドで `tokio::fs::write` | Rust 側でパスを制御したい場合は後者が安全。今回は `save()` ダイアログで取得したユーザー指定パスに書き込むため、JS 側の `writeTextFile` で十分 |
| CrossCopy `tauri-plugin-clipboard` | ポーリング自実装 (`setInterval` + `readText`) | ポーリングの場合 CPU 使用率が上がり、ポール間隔分の遅延が生じる。公式プラグインが監視未対応の現状では CrossCopy が最善 |

**Installation:**
```bash
# Rust crates (src-tauri/Cargo.toml に追加)
cargo add tauri-plugin-dialog tauri-plugin-fs tauri-plugin-clipboard

# npm
npm install @tauri-apps/plugin-dialog @tauri-apps/plugin-fs tauri-plugin-clipboard-api
```

**Version verification (2026-04-05 時点):**
- `npm view tauri-plugin-clipboard-api version` → `2.1.11` [VERIFIED: npm registry]
- tauri-plugin-dialog / tauri-plugin-fs は tauri-apps/plugins-workspace の Tauri 2 系。Cargo.toml に `version = "2"` を指定すれば latest stable を取得 [ASSUMED]

---

## Architecture Patterns

### Recommended Project Structure (追加分)
```
src/
├── components/
│   ├── DocumentMode.tsx      # CONV-08: 長文書モード UI
│   └── TitleBar.tsx          # WINX-05: ミニモードボタン追加
├── store/
│   ├── conversionStore.ts    # isMiniMode, isDocumentMode フラグ追加
│   └── documentStore.ts      # 段落アキュムレーター (任意: bufferStore 流用可)
├── hooks/
│   └── useClipboardWatch.ts  # WINX-06: startListening ラッパー
└── lib/
    └── tauri.ts              # exportDocument, saveFileDialog 追加

src-tauri/
└── capabilities/
    └── default.json          # fs / dialog / clipboard 権限追加
```

### Pattern 1: ミニモード切替 (WINX-05)

**What:** TitleBar にミニモードボタンを追加し、クリックで window サイズを縮小 / 復元する
**When to use:** ユーザーが「入力だけしたい」場面で他アプリを覆わない

```typescript
// Source: https://v2.tauri.app/reference/javascript/api/namespacewindow/
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';

const MINI_HEIGHT = 120; // TitleBar + input のみ
const FULL_SIZE = { width: 420, height: 600 }; // tauri.conf.json のデフォルト

async function toggleMiniMode(isMini: boolean) {
  const win = getCurrentWindow();
  if (isMini) {
    await win.setSize(new LogicalSize(FULL_SIZE.width, MINI_HEIGHT));
  } else {
    await win.setSize(new LogicalSize(FULL_SIZE.width, FULL_SIZE.height));
  }
}
```

**注意:** フル復帰時のサイズは固定値ではなく、ミニモードに入る直前のサイズを Zustand に保存しておいて使うべき。

### Pattern 2: 長文書モード / 段落アキュムレーター (CONV-08)

**What:** 変換するたびに結果を配列にアキュムレートし、最後にファイルエクスポートする
**When to use:** 複数段落を連続して変換しドキュメントを組み立てる場合

```typescript
// documentStore.ts — Phase 2 の bufferStore と同構造
interface DocumentStore {
  paragraphs: { id: string; input: string; output: string; }[];
  appendParagraph: (input: string, output: string) => void;
  removeParagraph: (id: string) => void;
  clearDocument: () => void;
}
```

エクスポートフロー:
```typescript
// Source: https://v2.tauri.app/plugin/dialog/ + https://v2.tauri.app/plugin/file-system/
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

async function exportDocument(content: string, format: 'md' | 'txt') {
  const ext = format === 'md' ? 'md' : 'txt';
  const path = await save({
    filters: [{ name: format === 'md' ? 'Markdown' : 'Text', extensions: [ext] }],
    defaultPath: `document.${ext}`,
  });
  if (!path) return; // ユーザーキャンセル
  await writeTextFile(path, content);
}
```

### Pattern 3: クリップボード監視 (WINX-06)

**What:** 外部でコピーされたテキストを自動的にインプットフィールドに取り込む
**When to use:** クリップボードウォッチモードが有効な間

```typescript
// Source: https://github.com/CrossCopy/tauri-plugin-clipboard
import { startListening, onTextUpdate } from 'tauri-plugin-clipboard-api';
import { useEffect, useRef } from 'react';

export function useClipboardWatch(enabled: boolean, onText: (text: string) => void) {
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      unlistenRef.current?.();
      unlistenRef.current = null;
      return;
    }

    let stopListening: () => void;

    (async () => {
      // onTextUpdate は CrossCopy の typed listener
      const unlistenText = await onTextUpdate((text) => {
        onText(text);
      });
      // startListening でバックグラウンドモニタースレッドを起動
      stopListening = await startListening();
      unlistenRef.current = () => {
        unlistenText();
        stopListening();
      };
    })();

    return () => {
      unlistenRef.current?.();
    };
  }, [enabled, onText]);
}
```

### Anti-Patterns to Avoid

- **ミニモードで `minHeight` を変更する:** `setMinSize` を変えると復帰後もサイズ制約が残る。`setSize` のみ変更し `minHeight` は触らない。
- **クリップボード監視を常時起動する:** ユーザーが設定でオフにできる必要がある。コンポーネントアンマウント時に必ず `stopListening()` を呼ぶ。
- **エクスポートを Rust 側コマンドで実装する:** パス選択ダイアログは JS の `save()` が担当し、書き込みは `writeTextFile()` が担当する 2 段構成で十分。Rust コマンドを追加する必要はない。
- **長文書モードと DraftBuffer を混在させる:** 両者は似ているが用途が異なる。DraftBuffer は「後でまとめてコピー」、長文書モードは「ドキュメントを組み立てて保存」。ストアを分離し UI も独立させる。

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| ファイル保存ダイアログ | カスタムパス入力フォーム | `save()` from `@tauri-apps/plugin-dialog` | OS ネイティブダイアログで安全なパス選択 |
| ファイル書き込み | `invoke('write_file', ...)` カスタムコマンド | `writeTextFile()` from `@tauri-apps/plugin-fs` | パス検証・パストラバーサル防止が内蔵 |
| クリップボード変更検出 | `setInterval` + `readText()` ポーリング | `startListening` from `tauri-plugin-clipboard-api` | ネイティブスレッドで監視、CPU 消費なし |
| ウィンドウサイズ管理 | Rust コマンド経由でリサイズ | `getCurrentWindow().setSize()` JS API | Tauri 公式 JS API で十分 |

**Key insight:** Phase 3 の 3 機能はいずれも Rust 側の新規コマンドを必要としない。新プラグインの初期化登録のみ Rust で行い、ロジックはすべてフロントエンドに収められる。

---

## Common Pitfalls

### Pitfall 1: ミニモード解除時のサイズ不定

**What goes wrong:** ミニモードに入る前のサイズを保存しておかないと、復帰時に固定値 (420×600) にしか戻れない。ユーザーがウィンドウをリサイズしていた場合に UX が壊れる。
**Why it happens:** `setSize` は現在のサイズを保持しない。
**How to avoid:** ミニモードへの切替前に `win.outerSize()` を Zustand に保存し、復帰時にその値を使う。
**Warning signs:** ウィンドウが想定外のサイズに戻る。

### Pitfall 2: `decorations: false` + `setSize` 互換性 (macOS/Windows)

**What goes wrong:** Tauri 2.2.x 系では undecorated ウィンドウで `setSize` が無効になるバグが報告されていた。
**Why it happens:** tao の undecorated shadow ウィンドウフラグ処理のバグ。
**How to avoid:** 現在の Cargo.lock では tao 0.34.8 が使用中。0.34.0 で修正が入っていることを CHANGELOG で確認済み。ただし **Windows でのパッケージ済みバイナリ** でミニモード切替を必ず手動テストする。`tauri dev` 環境と packaged build で挙動が異なるケースがある。
**Warning signs:** `setSize` 呼び出しが resolve するが視覚的にサイズが変わらない。

### Pitfall 3: CrossCopy プラグインと公式 clipboard-manager の二重登録

**What goes wrong:** `tauri_plugin_clipboard_manager::init()` と `tauri_plugin_clipboard::init()` を両方 `.plugin(...)` に渡すと、同じクリップボードリソースにアクセスするプラグインが 2 つ存在する。実害は少ないが権限設定が複雑になる。
**Why it happens:** 公式プラグインは書き込み専用、CrossCopy は監視専用と用途が分かれているが Tauri の内部リソースは共有。
**How to avoid:** `lib.rs` に CrossCopy プラグインを追加登録する。公式プラグインは既存の `writeText` / `readText` 呼び出しのために維持する。capabilities ファイルに CrossCopy 用の権限も追加する。
**Warning signs:** クリップボード書き込みまたは監視がサイレントに失敗する。

### Pitfall 4: クリップボード監視の自分自身のコピーをキャッチ

**What goes wrong:** ResultDisplay の「コピー」ボタンでクリップボードに書き込んだ直後、監視コールバックが発火して入力フィールドを変換結果で上書きする。
**Why it happens:** `onTextUpdate` は自分が書き込んだテキストも検出する。
**How to avoid:** 「コピー」操作の後 500ms 程度は監視コールバックを無視するロック (`ignoreNextRef`) を設ける。または、監視が取得したテキストと現在の変換結果を比較して無視する。
**Warning signs:** コピーボタンを押すと入力フィールドが変換済みテキストで上書きされる。

### Pitfall 5: `writeTextFile` のスコープ制限

**What goes wrong:** `tauri-plugin-fs` はデフォルトでアプリのサンドボックスディレクトリのみ書き込み可能。ユーザーが選んだ任意パスへ書き込もうとすると権限エラーになる。
**Why it happens:** Tauri 2 の capabilities スコープ制限。
**How to avoid:** `save()` ダイアログで選択したパスは自動的にスコープに追加される。capabilities に `fs:allow-write-text-file` と `dialog:allow-save` の両方を追加すること。
**Warning signs:** エクスポート時に `Not allowed to access this path` エラー。

---

## Code Examples

### capabilities/default.json に追加する権限

```json
{
  "permissions": [
    "core:default",
    "core:window:allow-start-dragging",
    "core:window:allow-close",
    "core:window:allow-minimize",
    "core:window:allow-set-size",
    "core:window:allow-outer-size",
    "clipboard-manager:default",
    "global-shortcut:allow-is-registered",
    "global-shortcut:allow-register",
    "global-shortcut:allow-unregister",
    "dialog:allow-save",
    "fs:allow-write-text-file",
    "clipboard:allow-start-monitor",
    "clipboard:allow-stop-monitor",
    "clipboard:allow-is-monitor-running",
    "clipboard:allow-read-text"
  ]
}
```

Source: [CITED: https://v2.tauri.app/learn/security/using-plugin-permissions/]

### Rust lib.rs — プラグイン追加登録

```rust
// Source: https://v2.tauri.app/plugin/dialog/ + CrossCopy README
tauri::Builder::default()
    .plugin(tauri_plugin_clipboard_manager::init())  // 既存: writeText
    .plugin(tauri_plugin_clipboard::init())           // 追加: watch mode
    .plugin(tauri_plugin_dialog::init())              // 追加: save dialog
    .plugin(tauri_plugin_fs::init())                  // 追加: file write
    // ... 既存プラグイン継続
```

### ミニモード切替コマンド (Rust 側不要 — JS のみ)

```typescript
// Source: https://v2.tauri.app/reference/javascript/api/namespacewindow/
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';

const MINI_SIZE = new LogicalSize(420, 110); // TitleBar(32px) + input(78px)

export async function enterMiniMode(): Promise<{ width: number; height: number }> {
  const win = getCurrentWindow();
  const size = await win.outerSize(); // 現在サイズを保存して返す
  await win.setSize(MINI_SIZE);
  return { width: size.width, height: size.height };
}

export async function exitMiniMode(savedSize: { width: number; height: number }) {
  const win = getCurrentWindow();
  await win.setSize(new LogicalSize(savedSize.width, savedSize.height));
}
```

### エクスポート関数

```typescript
// Source: https://v2.tauri.app/plugin/dialog/ + https://v2.tauri.app/plugin/file-system/
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';

export async function exportDocument(
  paragraphs: { input: string; output: string }[],
  format: 'md' | 'txt',
): Promise<boolean> {
  const content = paragraphs
    .map((p) => (format === 'md' ? `## 入力\n\n${p.input}\n\n## 変換\n\n${p.output}` : p.output))
    .join('\n\n---\n\n');

  const path = await save({
    filters: [{ name: format === 'md' ? 'Markdown' : 'Text', extensions: [format] }],
    defaultPath: `document.${format}`,
  });

  if (!path) return false; // キャンセル
  await writeTextFile(path, content);
  return true;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tauri 1: `@tauri-apps/api/dialog` の `save()` | Tauri 2: `@tauri-apps/plugin-dialog` の `save()` | Tauri 2.0 | インポートパスが変更。プラグイン初期化が必要 |
| `setSize` が undecorated で動かない (tao < 0.34) | tao 0.34.0+ で修正済み | 2025 Q1 | 現在の環境 (tao 0.34.8) では問題なし |
| 公式クリップボードプラグインに watch なし | CrossCopy コミュニティプラグインで補完 | Tauri 2.x 現在 | 公式では対応予定未定 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `tauri-plugin-dialog` と `tauri-plugin-fs` の Tauri 2 系バージョンは `version = "2"` で最新 stable が取得できる | Standard Stack | バージョン不整合でコンパイルエラー。Cargo.lock で確認すれば判明 |
| A2 | tao 0.34.0 の CHANGELOG に記述された undecorated setSize 修正が Windows 上のパッケージバイナリでも有効 | Common Pitfalls | ミニモードが Windows で動かない。実機テストで検出可能 |
| A3 | CrossCopy `tauri-plugin-clipboard` v2.x と公式 `tauri-plugin-clipboard-manager` は競合なく共存できる | Standard Stack / Code Examples | クリップボード書き込みまたは監視がサイレント失敗。インテグレーションテストで検出可能 |

---

## Open Questions

1. **長文書モードは既存 DraftBuffer を再利用するか、独立した DocumentStore を作るか**
   - What we know: DraftBuffer は `text + styleId` を持ち、並び替え可能
   - What's unclear: 長文書モードに `input + output` の両テキストを保持する必要があるか、変換後テキストのみで十分か
   - Recommendation: 独立した `documentStore.ts` を作成する。DraftBuffer との用途の違いを明確化するため。ただしコンポーネント構造は DraftBuffer に倣えばよい

2. **クリップボード監視: ウィンドウ非アクティブ時も監視継続するか**
   - What we know: CrossCopy のモニタースレッドはバックグラウンドで動く
   - What's unclear: ウィンドウが隠れている状態 (global shortcut で hide) でも `onTextUpdate` が発火するか
   - Recommendation: 動作確認テストを Wave 0 に含める。ユーザーが「監視中」インジケーターを TitleBar に表示する

3. **ミニモードの最小高さ**
   - What we know: tauri.conf.json の `minHeight: 400` が現在設定されている
   - What's unclear: ミニモード時は minHeight を一時的に下げる必要があるか
   - Recommendation: `setMinSize` を `null` (制約解除) にしてから `setSize` を呼ぶか、または tauri.conf.json の `minHeight` を削除してアプリ側で管理する

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `tauri-plugin-dialog` crate | CONV-08 export | 要追加 | 2.x (Cargo install) | — |
| `tauri-plugin-fs` crate | CONV-08 export | 要追加 | 2.x (Cargo install) | — |
| `tauri-plugin-clipboard` crate | WINX-06 | 要追加 | 2.x (Cargo install) | ポーリング自実装 (非推奨) |
| `@tauri-apps/plugin-dialog` npm | CONV-08 | 要追加 | latest | — |
| `@tauri-apps/plugin-fs` npm | CONV-08 | 要追加 | latest | — |
| `tauri-plugin-clipboard-api` npm | WINX-06 | 要追加 | 2.1.11 [VERIFIED: npm] | — |
| `getCurrentWindow().setSize()` | WINX-05 | 既存 `@tauri-apps/api` に含まれる | 2.x | — |
| `core:window:allow-set-size` capability | WINX-05 | capabilities/default.json に要追加 | — | — |

**Missing dependencies with no fallback:**
- `tauri-plugin-dialog` + `tauri-plugin-fs`: エクスポート機能はこれなしに実装不可
- `core:window:allow-set-size`: capabilities に追加しないとミニモードが動かない

**Missing dependencies with fallback:**
- `tauri-plugin-clipboard` (CrossCopy): 監視が不可な場合は `setInterval` + `readText()` ポーリングで代替可能だが CPU コストが高い

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes (ファイルシステムスコープ) | Tauri capabilities scope — `dialog:allow-save` + `fs:allow-write-text-file` |
| V5 Input Validation | yes (エクスポートコンテンツ) | 変換済みテキストをそのままファイル書き込み — ユーザー自身のデータなので XSS リスクなし |
| V6 Cryptography | no | — |

### Known Threat Patterns for Phase 3 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal in file export | Tampering | `tauri-plugin-fs` の built-in パス検証 + `dialog:allow-save` スコープ |
| Clipboard hijacking (悪意ある外部アプリが大量クリップボード更新) | Denial of Service | 監視コールバックにデバウンス (300ms) を入れる |
| クリップボードから機密情報の自動取り込み | Information Disclosure | ユーザーが明示的に「監視中」を認識できる UI インジケーターを用意する |

---

## Sources

### Primary (HIGH confidence)
- [v2.tauri.app/plugin/clipboard/](https://v2.tauri.app/plugin/clipboard/) — 公式プラグイン機能確認 (watch 非対応)
- [v2.tauri.app/plugin/dialog/](https://v2.tauri.app/plugin/dialog/) — `save()` API 確認
- [v2.tauri.app/plugin/file-system/](https://v2.tauri.app/plugin/file-system/) — `writeTextFile()` API 確認
- [v2.tauri.app/reference/javascript/api/namespacewindow/](https://v2.tauri.app/reference/javascript/api/namespacewindow/) — `setSize` JS API
- tao CHANGELOG (WebFetch) — 0.34.0 で undecorated setSize 修正確認
- npm registry — `tauri-plugin-clipboard-api` v2.1.11 確認

### Secondary (MEDIUM confidence)
- [github.com/CrossCopy/tauri-plugin-clipboard](https://github.com/CrossCopy/tauri-plugin-clipboard) — `startListening` / `onTextUpdate` API 確認
- GitHub Issue #12168 (WebFetch) — setSize バグが tao PR merge で resolved 確認

### Tertiary (LOW confidence)
- WebSearch 結果: Tauri 2.10 での setSize 動作 — tao バージョンから推定、Windows 実機未確認

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 公式ドキュメントと npm registry で確認済み
- Architecture: HIGH — 既存 Phase 1/2 パターンの直接延長
- Pitfalls: MEDIUM — setSize + decorations:false の Windows 実機は未検証

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (Tauri 2.x は月次リリースあり。dialog/fs プラグイン API は安定)
