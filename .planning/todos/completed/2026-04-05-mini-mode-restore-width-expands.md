---
created: 2026-04-05T23:32:24.406Z
title: ミニモード復帰時に横幅が広がる問題を修正
area: ui
files:
  - src/lib/tauri.ts:195-209
  - src/store/conversionStore.ts
---

## Problem

TitleBar のミニモードボタンをクリックするとウィンドウが縦に小さく表示される。
しかしもとのサイズに戻そうとすると横幅が非常に長くなってしまい、元のサイズに戻らない。

Phase 3 検証中に発見。`enterMiniMode()` の `scaleFactor()` 変換で一度修正を試みたが、
復帰時の幅が広がる問題が残っている可能性あり。

`exitMiniMode` で `LogicalSize(savedSize.width, savedSize.height)` に渡す `savedSize` が
正しい論理ピクセル値かどうか、および `savedSize` が Zustand の `conversionStore` に
正しく保持されているかを確認する必要がある。

## Solution

1. `enterMiniMode()` が返す `{ width, height }` が確実に論理ピクセルであることを確認
2. `conversionStore.savedSize` が mini mode 中に上書きされていないことを確認
3. `exitMiniMode(savedSize)` が正しい論理サイズを受け取っていることをログで確認
4. 必要であれば `savedSize` を Rust 側 (`get_window_state`) から取得する方式に変更
