# Jimaku

A Chrome extension that translates Prime Video subtitles into your chosen language in real time using AI, and overlays them on top of the player.

Subtitles are intercepted from the player's network requests, translated via your chosen provider, and painted on top of the native caption track.

## Install

The extension isn't on the Chrome Web Store yet. To install it manually:

1. Download the latest build (`dist/` folder) from the [Releases](../../releases) page, or build it yourself with `npm install && npm run build`.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `dist/` folder.

## Setup

Click the extension icon and pick a translation provider:

- **OpenRouter** — one-click OAuth, no key handling required.
- **Anthropic** — paste an API key from [console.anthropic.com](https://console.anthropic.com/).
- **OpenAI** — paste an API key from [platform.openai.com](https://platform.openai.com/).

Your key is stored locally in your browser and is only sent to the provider you chose.

## Usage

1. Open a Prime Video title and start playback (with English captions enabled — they're the source we translate from).
2. The popup shows progress; translated lines stream in as the model returns them.
3. Toggle "Show translated overlay" and "Hide original subtitles" in the popup to taste — language-learning mode (both visible) and replacement mode (translated only) are both supported.

## Supported subtitle formats

- WebVTT
- SRT
- TTML / DFXP
- HLS WebVTT (playlists with segmented `.vtt` files)

## Known limitations

- Occasional chunks may fall back to the original text if the model's response is malformed.
- The API key is stored in plain text in `chrome.storage.local`. Don't use this extension on a shared browser profile.
- Translation uses your chosen provider's API and counts against your usage / billing.
- Some TTML timing variants (SMPTE time) aren't supported.
