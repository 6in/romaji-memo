# Romaji Memo

ローマ字入力をAIで日本語・英語・各種スタイルに変換するデスクトップアプリ。常に最前面に表示されるフローティングツールとして動作し、チャット・ドキュメント執筆・コードコメントなど幅広い場面で使える。

**コアバリュー:** ローマ字をタイプするだけで、スペースなし連続入力でも文脈からAIが正しく日本語・英語に変換し、ワンクリックでコピーできること。

## 必要環境

- Node.js 18+
- Rust（[rustup](https://rustup.rs) 経由でインストール）
- macOS 12+ または Windows 10+

## セットアップ

### 1. APIキーをOSキーチェーンに登録

APIキーはOSキーチェーンにのみ保存されます。設定ファイルやlocalStorageには保存しません。

アプリ内部では `Entry::new("romaji-memo", provider_id)`（keyring crate v3.6.3）を使用します。
- service = `romaji-memo`（固定）
- account = provider_id（例: `anthropic`, `openai`）

**macOS — キーチェーンにAPIキーを登録:**

```bash
# Anthropic (Claude) — デフォルト推奨プロバイダー
security add-generic-password -s "romaji-memo" -a "anthropic" -w "sk-ant-YOUR_KEY_HERE"

# OpenAI（任意）
security add-generic-password -s "romaji-memo" -a "openai" -w "sk-YOUR_KEY_HERE"
```

既存のキーを更新する場合は先に削除してから再登録:

```bash
security delete-generic-password -s "romaji-memo" -a "anthropic"
security add-generic-password -s "romaji-memo" -a "anthropic" -w "sk-ant-YOUR_KEY_HERE"
```

**Windows — 資格情報マネージャーに登録:**

```powershell
# Anthropic (Claude) — デフォルト推奨プロバイダー
cmdkey /add:romaji-memo /user:anthropic /pass:sk-ant-YOUR_KEY_HERE

# OpenAI（任意）
cmdkey /add:romaji-memo /user:openai /pass:sk-YOUR_KEY_HERE
```

`/add:romaji-memo` と `/user:anthropic` は `Entry::new("romaji-memo", "anthropic")` が生成する値と完全に一致している必要があります。keyring crate v3.6.3 は Windows 資格情報マネージャーの「汎用資格情報」タイプとして保存します。

実行時に資格情報が見つからない場合は、資格情報マネージャー（コントロールパネル → ユーザーアカウント → 資格情報マネージャー → Windows 資格情報）で、ターゲット `romaji-memo`・ユーザー名 `anthropic` の汎用資格情報が存在するか確認してください。

Windowsで既存のキーを更新する場合:

```powershell
cmdkey /delete:romaji-memo
cmdkey /add:romaji-memo /user:anthropic /pass:sk-ant-YOUR_KEY_HERE
```

### 2. Ollama（ローカル — APIキー不要）

完全オフラインで使用する場合は Ollama を利用できます:

1. https://ollama.ai から Ollama をインストール
2. モデルを取得: `ollama pull gemma3:12b`
3. アプリ起動前に Ollama が `localhost:11434` で動作していること

Ollama の場合、APIキー登録は不要です。`providers.json` でデフォルトプロバイダーを `ollama-local` に設定してください。

## 開発

```bash
npm install
npx tauri dev
```

## ビルド

```bash
npx tauri build
```

ビルドされたアプリは `src-tauri/target/release/bundle/` に出力されます。

> **macOS での配布について:** 未署名のアプリは「壊れている」と表示される場合があります。受け取り側で以下を実行してください:
> ```bash
> xattr -cr /Applications/RomajiMemo.app
> ```

## 使い方

1. **ローマ字を入力** — スペース不要、AIが文脈から単語境界を判断
2. **変換スタイルを選択** — ドロップダウンから選択（8種のプリセット＋カスタムスタイル）
3. **「変換」をクリック** または **Cmd/Ctrl+Enter** で変換
4. **結果を確認** — 意図（"意図:"）と誤字修正（"修正:"）が結果の下に表示
5. **コピーアイコンをクリック** してクリップボードにコピー（変換時に自動コピーも可）
6. **ピンアイコン** でウィンドウの最前面固定を切り替え
7. **太陽/月アイコン** でダーク/ライトテーマを切り替え
8. **ウィンドウ下部のドロワーボタン** で変換履歴を開く
9. **「新しい会話」ボタン**（タイトルバー）でコンテキストと長文モードの内容をリセット

### 変換スタイル

| スタイル | 説明 |
|----------|------|
| 標準 | 標準的な日本語 |
| 丁寧 | 丁寧な日本語 |
| 大阪弁 | 大阪方言 |
| おかま | 女性的な話し方 |
| 武士 | 武士口調 |
| ギャル | ギャル語 |
| ビジネス | ビジネス敬語 |
| AIプロンプト | AIプロンプト向け英語 |

カスタムスタイルは **設定 → スタイルマネージャー** で作成・管理できます。

### 変換履歴

- ウィンドウ下部のドロワーに過去の変換がスタイル・プレビュー・タイムスタンプ付きで表示
- 履歴アイテムをクリックするとそのローマ字入力が再ロードされる
- 履歴はアプリ再起動後も保持（SQLiteに保存）
- 直近の履歴はAIプロンプトに含まれ、文脈を考慮した変換が可能
- 「新しい会話」でストッパーを挿入してAIの会話コンテキストをリセット

### 長文モード（Document Mode）

段落ごとに長文を書く場合に使用します:

1. タイトルバーのドキュメントアイコンで長文モードに切り替え
2. ローマ字を入力して変換 — 変換のたびに段落として追記される
3. 段落追加時は自動スクロールで最新内容が表示される
4. **プレビュー** ボタンで全文を表示・コピー
5. **エクスポート** で `.md` または `.txt` として保存
6. 「新しい会話」で蓄積した段落をすべてクリアして最初からやり直し

### ドラフトバッファ

- 変換結果をドラフトバッファに保存して後から使える
- 保存したアイテムの並び替え・削除・一括コピーが可能
- タイトルバーのバッファアイコンからアクセス

### 設定

タイトルバーのギアアイコンから開きます:

- **プロバイダー** — AIプロバイダー（Anthropic・OpenAI・Ollama・LM Studio）の設定、APIキー登録、アクティブプロバイダーの選択
- **履歴** — 変換履歴の保持設定
- **スタイルマネージャー** — カスタム変換スタイルの作成・編集・削除

## プロバイダー設定

アプリはデータディレクトリに `providers.json` を持ちます:

- **デフォルトプロバイダー:** Anthropic（Claude Haiku）
- **Ollama（ローカル）:** `http://localhost:11434/v1` で事前設定済み
- **OpenAI:** デフォルト無効。`"enabled": true` に変更することで有効化

`providers.json` の場所:
- macOS: `~/Library/Application Support/romaji-memo/providers.json`
- Windows: `%APPDATA%\romaji-memo\providers.json`

APIキーは `providers.json` や設定ファイルには保存されません。OSキーチェーンにのみ保存されます。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| デスクトップシェル | Tauri 2.10.3 |
| フロントエンド | React 19 + TypeScript 5 |
| バンドラー | Vite 6 |
| スタイリング | Tailwind CSS v4 + shadcn/ui |
| 状態管理 | Zustand 5 + TanStack Query 5 |
| アイコン | Lucide React |
| バックエンド | Rust（stable 1.77.2+） |
| データベース | SQLite（rusqlite 0.39.0 bundled、FTS5） |
| キーチェーン | keyring 3.6.3（OS Keychain / Credential Manager） |
| HTTP | reqwest 0.13（rustls-tls） |

## セキュリティ

- APIキーはOSキーチェーン（macOS Security framework / Windows Credential Manager）にのみ保存
- APIキーはディスク・設定ファイル・localStorageに書き込まれない
- AI向けのHTTP呼び出しはすべてRustバックエンドで実行 — キーがフロントエンドに渡ることはない
- `providers.json` のキーフィールドにはプレースホルダー `"<encrypted>"` が表示される

## パフォーマンス目標

- 起動時間: 3秒以内（コールドスタート）
- メモリ使用量: 200MB以下（Tauriメインプロセス + WebView 合計）
- 対応プラットフォーム: macOS 12+ / Windows 10+
