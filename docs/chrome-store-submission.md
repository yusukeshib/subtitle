# Chrome Web Store submission notes

Copy/paste-ready text for the fields in the Chrome Web Store Developer
Dashboard. Keep this in sync with `manifest.config.ts` whenever
permissions or hosts change.

## Privacy policy URL

`https://yusukeshib.github.io/jimaku/privacy-policy.html`

Source: `docs/privacy-policy.md` on the `main` branch, served by
GitHub Pages.

## Store listing — short description (132 char max)

> AI subtitle translation for Prime Video. Unofficial — not affiliated with Amazon.

(82 characters.)

## Store listing — detailed description

> Jimaku translates the subtitles of what you are watching on Prime
> Video into your chosen language, in real time, and overlays the
> translated text on top of the player.
>
> Unofficial. Not affiliated with, sponsored by, or endorsed by Amazon.
>
> Pick a provider once in the popup:
>
> • OpenRouter — one-click OAuth, no key handling required
> • Anthropic (Claude) — paste an API key
> • OpenAI — paste an API key
>
> Your key stays in your browser and is only sent to the provider you
> chose. Translation counts against your own usage / billing with that
> provider.
>
> Language-learning mode (both translated and original captions
> visible) and replacement mode (translated only) are both supported.
>
> Supported subtitle formats: WebVTT, SRT, TTML / DFXP, HLS WebVTT.
>
> Known limitations:
>
> • Occasional chunks may fall back to the original text if the
>   model's response is malformed.
> • API keys are stored in plain text in chrome.storage.local; do not
>   use this extension on a shared browser profile.
>
> Source code: https://github.com/yusukeshib/jimaku

## Category

Productivity (primary) — alternatives: Accessibility.

## Single purpose

Jimaku translates the English subtitle track of a video the user is
currently watching on Prime Video, and overlays the translated text on
top of the player.

## Permission justifications

### `storage`

Stores the user's settings: selected translation provider, API key (for
Anthropic/OpenAI) or OAuth token (for OpenRouter), target language, and
UI toggles (auto-translate on/off, show/hide overlay). All data stays
in `chrome.storage.local` on the user's device.

### `webRequest`

On Prime Video, the player fetches subtitle files (TTML/VTT) from
Amazon's CDN. The extension uses webRequest in observe-only mode (no
blocking, no redirection) to learn the URL of the active subtitle track
so it can download and translate it. Without webRequest, there is no
way to know which caption URL the player chose for the user's
language/title.

### `webNavigation`

Prime Video is a single-page app.
`webNavigation.onHistoryStateUpdated` is used to detect when the user
navigates to a different episode or title so the extension can reset
its cached subtitle state for the new video.

### `scripting`

Used to re-inject the overlay script into the player page when the
user navigates between episodes without a full reload. The
content-script entry only runs at `document_idle`;
`scripting.executeScript` lets us refresh state on SPA transitions.

### `identity`

Used for the OpenRouter OAuth flow — `chrome.identity.launchWebAuthFlow`
lets the user connect their OpenRouter account in one click instead of
manually copying an API key. Only used when the user selects "Connect
with OpenRouter".

## Host permission justifications

### Streaming hosts (content script + webRequest)

- `*.amazon.com`, `*.amazon.co.jp`, `*.primevideo.com` — the pages where
  the Prime Video player runs. The content script renders the
  translated-subtitle overlay here.
- `*.media-amazon.com`, `*.pv-cdn.net`, `*.aiv-cdn.net` — Amazon's video
  CDNs that serve TTML/VTT subtitle files. Needed to (a) observe which
  subtitle URL the player picked via webRequest and (b) fetch the same
  file to translate it.

### Translation provider hosts

The user picks one provider in the popup. Host permission is declared
for all three so the extension can talk to whichever the user selects;
a user who only uses OpenRouter will never generate traffic to
Anthropic or OpenAI.

- `api.anthropic.com` — Claude API (user provides their own key)
- `api.openai.com` — OpenAI API (user provides their own key)
- `openrouter.ai` — OpenRouter API + OAuth endpoints

## Remote code

**No.** Jimaku does not load or execute code fetched at runtime. All
JavaScript is bundled into the packaged extension. Calls to
`api.anthropic.com`, `api.openai.com`, and `openrouter.ai` send
subtitle text and receive translated text — this is data, not code.

## Data practices (Privacy tab)

| Question | Answer |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial / payment information | No |
| Authentication information | **Yes** — user's own API key / OAuth token, stored locally, not transmitted to any third party except the provider the user chose |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Website content | **Yes** — subtitle text from the current video is sent to the user's selected translation provider (Anthropic / OpenAI / OpenRouter) for translation. |

Checkbox certifications:

- [x] I do not sell or transfer user data to third parties outside of
      the approved use cases
- [x] I do not use or transfer user data for purposes unrelated to my
      item's single purpose
- [x] I do not use or transfer user data to determine creditworthiness
      or for lending purposes
