# Jimaku

Chrome extension (MV3) that translates Amazon Prime Video's English subtitles via Claude and overlays them on the player. Target language is user-selectable from the popup.

## Layout

- `src/background.ts` — service worker; intercepts subtitle network requests, draws the action icon per status, relays badge/icon state per tab
- `src/content.ts` — content script; renders the translated overlay on the player, positioned relative to Prime Video's native caption element
- `src/popup/` — extension popup (status, progress, Generate/Regenerate, language dropdown, toggles, API key entry)
- `src/lib/` — shared modules (cache, translate, subtitle parsers)
- `manifest.config.ts` — MV3 manifest (built via `@crxjs/vite-plugin`)
- `eval/` — offline translation eval harness (see `docs/translation-eval.md`)

## Scripts

- `npm run dev` — Vite dev server with HMR (writes dev build to `dist/`)
- `npm run build` — production build to `dist/`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` / `npm run check` — Biome (check / check --write)
- `npm run chrome` — launches Chrome with `dist/` loaded + remote debugging on port 9222
- `npm run chrome:build` — `build` then `chrome`

## Dev workflow

Use `npm run chrome:build` for every iteration — CRXJS HMR via `npm run dev` exists but has been too flaky to rely on (stale dev manifests after manifest edits, service-worker reload races, CORS quirks). Production builds are fast (<200ms) so there's no real cost to the explicit rebuild.

1. Edit code
2. `npm run chrome:build` (or `npm run build` + click Reload on `chrome://extensions` if Chrome is already running)
3. Refresh the Prime Video tab

The popup shows the current git short SHA (plus `-dirty` if uncommitted) to confirm which build is loaded.

## Debugging via chrome-devtools MCP

1. Run `npm run chrome:build` (or `npm run chrome` if `dist/` already has a dev/prod build) — Chrome launches with the extension loaded and CDP on `localhost:9222`
2. Use the `chrome-devtools` MCP tools to drive it (`list_pages`, `navigate_page`, `take_snapshot`, `list_console_messages`, `evaluate_script`, etc.)
3. The MCP server attaches to the already-running Chrome; it cannot install an unpacked extension itself
4. The popup is at `chrome-extension://<id>/src/popup/popup.html` — navigate there to inspect it outside of toolbar-click context

Test URL for subtitle playback (from `docs/translation-eval.md`):

```
https://www.amazon.com/gp/video/detail/0SPTCVEAFL4BJFE4TARP8B1F6K/?autoplay=1&t=0
```

## Further reading

- `docs/translation-eval.md` — prompt iteration workflow against the Prime Video gold JA track, plus notes on Prime Video's playback/subtitle endpoints
