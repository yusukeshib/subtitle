# Prime JA Subs

A Chrome extension (MV3) that translates Amazon Prime Video's English subtitles into Japanese using Claude Opus 4.7 and overlays them on the video.

## Supported subtitle formats

- **WebVTT** (`.vtt`)
- **TTML / DFXP** (`.xml`, `.dfxp`, `.ttml`, `.ttml2`) — Prime Video's standard format
- **HLS WebVTT** (`.m3u8` playlist + `.vtt` segments) — used by newer titles
  - Uses `X-TIMESTAMP-MAP` to convert to absolute time when present
  - Otherwise accumulates `#EXTINF` values from the playlist to offset each segment

The fetched text is sniffed by its leading bytes to auto-detect the format (`src/lib/subtitle.ts`).

## Development

```bash
npm install
npm run dev      # Vite dev build
npm run build    # Production build -> dist/
npm run lint     # Biome check
npm run format   # Biome format
npm run typecheck
```

## Install (unsigned)

1. `npm run build`
2. Chrome → `chrome://extensions` → enable Developer mode
3. "Load unpacked" → select `dist/`
4. Open the extension options and paste your Anthropic API key

## Known limitations

- Translations come back from Claude as `<line>` tags. If the model breaks the tag structure, that chunk falls back to the source English (mitigated with 4 retries + exponential backoff)
- Rendered alongside Prime's native subtitles (Japanese at the top of the frame, English at the bottom)
- The API key is stored in `chrome.storage.local` in plain text
- Subtitle URL detection is pattern-based. If Prime changes their URL conventions, update `SUBTITLE_URL_RE` / `SUBTITLE_PATH_HINT` / `HINTED_CONTAINER_RE` in `src/background.ts`
- TTML timing supports clock time (`HH:MM:SS.fff`) and offsets (`Ns` / `Nms` / `Nf` / `Nt`). SMPTE time is not supported

## Architecture

```
background.ts    Captures subtitle URLs via webRequest
                 Stores URLs per tab, replays them on CONTENT_READY
                 Resets on SPA navigation via webNavigation.onHistoryStateUpdated
       │
       │ SUBTITLE_DETECTED / TAB_RESET
       ▼
content.ts       Shadow DOM overlay + translate button
                 On click: fetch → loadCues → translateCues
                 Selects the active cue via timeupdate + binary search
                 Aborts in-flight translation on navigation via AbortController
       │
       ▼
lib/subtitle.ts  Format detection + dispatch
  ├─ lib/vtt.ts  WebVTT parser
  ├─ lib/ttml.ts TTML/DFXP parser (DOMParser-based)
  └─ lib/m3u8.ts HLS playlist parsing + parallel VTT segment fetch + offset correction
       │
       ▼
lib/translate.ts Claude Opus 4.7, 50 cues per chunk
                 System prompt uses prompt caching (ephemeral)
                 Retries up to 4 times on 429 / 5xx / network failures
```
