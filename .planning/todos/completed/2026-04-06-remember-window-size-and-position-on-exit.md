---
created: 2026-04-06T00:00:00.000Z
title: アプリ終了時のウィンドウサイズと位置を記憶する
area: ui
files:
  - src-tauri/src/lib.rs
  - src/lib/tauri.ts
---

## Problem

アプリを終了して再起動するたびにウィンドウが初期位置・初期サイズに戻る。
毎回ウィンドウを好みの位置とサイズに移動し直す手間がかかる。

## Solution

アプリ終了時にウィンドウのサイズと位置を SQLite または設定ファイルに保存し、
起動時に復元する。

**実装方針:**

1. Rust 側でアプリ終了イベント (`on_window_event` で `CloseRequested` または `tauri::RunEvent::Exit`) をフック
2. `window.outer_position()` と `window.outer_size()` を取得して保存
3. 保存先は既存の SQLite DB (`settings` テーブルに JSON カラムとして追加) または `tauri-plugin-store`
4. 起動時 (`setup` フック内) に保存値を読み出し、`window.set_position()` と `window.set_size()` で復元
5. 保存値がない場合は `tauri.conf.json` のデフォルト値を使用

**考慮点:**
- 複数モニター環境でモニターが取り外された場合の位置が画面外になるケースのガード
- ミニモード中に終了した場合は通常サイズを保存する（savedSize を使う）
