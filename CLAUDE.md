# Jimaku

Chrome extension (MV3) that translates Amazon Prime Video's English subtitles into Japanese via Claude and overlays them on the player.

## Layout

- `src/background.ts` — service worker; intercepts subtitle network requests, calls Claude, caches translations
- `src/content.ts` — content script; renders the Japanese overlay on the player
- `src/options/` — options page (API key, model settings)
- `src/lib/` — shared modules
- `manifest.config.ts` — MV3 manifest (built via `@crxjs/vite-plugin`)
- `eval/` — offline translation eval harness (see `docs/translation-eval.md`)

## Scripts

- `npm run dev` — Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` / `npm run check` — Biome (check / check --write)
- `npm run chrome` — launches Chrome with `dist/` loaded + remote debugging on port 9222
- `npm run chrome:build` — `build` then `chrome`

## Debugging via chrome-devtools MCP

1. Run `npm run chrome:build` — Chrome launches with the extension loaded and CDP on `localhost:9222`
2. Use the `chrome-devtools` MCP tools to drive it (`list_pages`, `navigate_page`, `take_snapshot`, `list_console_messages`, `evaluate_script`, etc.)
3. The MCP server attaches to the already-running Chrome; it cannot install an unpacked extension itself

Test URL for subtitle playback (from `docs/translation-eval.md`):

```
https://www.amazon.com/gp/video/detail/0SPTCVEAFL4BJFE4TARP8B1F6K/?autoplay=1&t=0
```

## Further reading

- `docs/translation-eval.md` — prompt iteration workflow against the Prime Video gold JA track, plus notes on Prime Video's playback/subtitle endpoints
