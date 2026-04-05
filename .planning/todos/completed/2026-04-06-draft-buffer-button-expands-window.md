---
created: 2026-04-06T00:00:00.000Z
title: バッファ/履歴ボタンでウィンドウが巨大化する問題を修正
area: ui
files:
  - src/components/DraftBuffer.tsx:78-83
  - src/components/HistoryDrawer.tsx:48-52
---

## Problem

DraftBuffer の開閉ボタンをクリックするとウィンドウサイズが巨大になる。
HistoryDrawer も同じコードパターンなので同様の問題が発生すると考えられる。

## Root Cause

`outerSize()` は PhysicalSize (物理ピクセル) を返すが、
それを `LogicalSize` にそのまま渡しているため、
Retina (2x) ディスプレイでは 2 倍の論理サイズ = 4 倍の物理サイズになる。

```ts
// DraftBuffer.tsx L78-83 (バグ)
const size = await win.outerSize();       // PhysicalSize (例: 840x1000)
const newHeight = isOpen ? currentHeight + BUFFER_HEIGHT : ...;
await win.setSize(new LogicalSize(size.width, newHeight));  // 840 は論理じゃない!
```

## Solution

`scaleFactor()` で割って論理ピクセルに変換する。
DraftBuffer と HistoryDrawer の両方を修正する。

```ts
const win = getCurrentWindow();
const scale = await win.scaleFactor();
const physSize = await win.outerSize();
const logWidth = physSize.width / scale;
const logHeight = physSize.height / scale;
const newHeight = isOpen ? logHeight + BUFFER_HEIGHT : logHeight - BUFFER_HEIGHT;
await win.setSize(new LogicalSize(logWidth, Math.max(newHeight, 400)));
```
