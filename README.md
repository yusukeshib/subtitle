# Prime JA Subs

Amazon Prime Video の英語字幕を Claude Opus 4.7 で日本語に翻訳し、動画上にオーバーレイ表示する Chrome 拡張（MV3）。

## 対応字幕フォーマット

- **WebVTT** (`.vtt`)
- **TTML / DFXP** (`.xml`, `.dfxp`, `.ttml`, `.ttml2`) — Prime Video の標準形式
- **HLS WebVTT** (`.m3u8` プレイリスト + セグメント .vtt) — 新しい作品で採用
  - `X-TIMESTAMP-MAP` がある場合はそれで絶対時刻に変換
  - なければプレイリストの `#EXTINF` を累積してオフセット補正

取得した文字列の先頭を sniff して自動判別する（`src/lib/subtitle.ts`）。

## 開発

```bash
npm install
npm run dev      # Vite dev build
npm run build    # 本番ビルド -> dist/
npm run lint     # Biome でチェック
npm run format   # Biome でフォーマット
npm run typecheck
```

## インストール（未署名）

1. `npm run build`
2. Chrome → `chrome://extensions` → デベロッパーモード ON
3. 「パッケージ化されていない拡張機能を読み込む」→ `dist/` を選択
4. 拡張機能のオプションから Anthropic API キーを入力

## 既知の制約

- 翻訳は `<line>` タグ形式で Claude から取得。モデルがタグを壊した場合はそのチャンクが英語フォールバックになる（リトライ 4 回 + 指数バックオフで緩和）
- Prime 標準字幕と同時表示する（日本語は画面上端、英語は下端）
- API キーは `chrome.storage.local` に平文保存
- 字幕 URL の検出はパターンベース。Prime 側が URL 命名規則を変更した場合は `src/background.ts` の `SUBTITLE_URL_RE` / `SUBTITLE_PATH_HINT` / `HINTED_CONTAINER_RE` を更新する
- TTML の時間指定は clock time (`HH:MM:SS.fff`) と offset (`Ns` / `Nms` / `Nf` / `Nt`) に対応。SMPTE time は非対応

## アーキテクチャ

```
background.ts    webRequest で字幕 URL を捕捉
                 タブごとに URL を記憶、CONTENT_READY で再送
                 webNavigation.onHistoryStateUpdated で SPA 遷移を検出して reset
       │
       │ SUBTITLE_DETECTED / TAB_RESET
       ▼
content.ts       Shadow DOM オーバーレイ + 翻訳ボタン
                 ボタン押下で fetch → loadCues → translateCues
                 timeupdate + 二分探索で表示 cue を切替
                 遷移時は AbortController で進行中翻訳を中断
       │
       ▼
lib/subtitle.ts  フォーマット判別 + ディスパッチ
  ├─ lib/vtt.ts  WebVTT パーサ
  ├─ lib/ttml.ts TTML/DFXP パーサ (DOMParser ベース)
  └─ lib/m3u8.ts HLS プレイリスト解析 + VTT セグメント並列取得 + オフセット補正
       │
       ▼
lib/translate.ts Claude Opus 4.7, 50 cue / chunk
                 system prompt はプロンプトキャッシュ (ephemeral)
                 429/5xx/ネットワーク失敗は最大 4 回リトライ
```
