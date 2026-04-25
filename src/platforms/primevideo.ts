import type { Platform } from "./types";

const PV_HOSTS = [
  "*://*.amazon.com/*",
  "*://*.amazon.co.jp/*",
  "*://*.primevideo.com/*",
  "*://*.media-amazon.com/*",
  "*://*.pv-cdn.net/*",
  "*://*.aiv-cdn.net/*",
  // Prime Video's DASH CDN also serves subtitle segments from Akamai.
  "*://*.akamaized.net/*",
] as const;

// Manifest match patterns can't express "/dp/ anywhere in the path"
// (only positional `/*/dp/*` etc.), so we inject on the whole host and let
// `matches()` below decide at runtime whether the page is actually ours.
const PV_CONTENT_MATCHES = [
  "*://*.amazon.com/*",
  "*://*.amazon.co.jp/*",
  "*://*.primevideo.com/*",
] as const;

const PV_AMAZON_HOST_RE = /(^|\.)(amazon\.com|amazon\.co\.jp)$/i;
const PV_PRIMEVIDEO_HOST_RE = /(^|\.)primevideo\.com$/i;
const PV_AMAZON_PATH_RE = /^\/gp\/video\/|\/dp\/[A-Z0-9]/i;

export const primeVideo: Platform = {
  id: "primevideo",

  matches(url: URL) {
    if (PV_PRIMEVIDEO_HOST_RE.test(url.hostname)) return true;
    if (!PV_AMAZON_HOST_RE.test(url.hostname)) return false;
    return PV_AMAZON_PATH_RE.test(url.pathname);
  },

  hostPermissions: PV_HOSTS,
  contentScriptMatches: PV_CONTENT_MATCHES,

  webRequestUrls: PV_HOSTS,

  webNavigationFilters: [
    { hostContains: "amazon.com" },
    { hostContains: "amazon.co.jp" },
    { hostContains: "primevideo.com" },
  ],

  titleKeyFromUrl(url: URL) {
    const m = url.pathname.match(/\/(?:gp\/video\/detail|detail|dp)\/([A-Z0-9]+)/i);
    return m ? `${url.host}:${m[1]}` : `${url.host}${url.pathname}`;
  },

  captionTextSelectors: [
    ".atvwebplayersdk-captions-text",
    '.webPlayerSDKContainer [class*="caption"][class*="text"]',
  ],

  captionHideSelectors: [
    ".atvwebplayersdk-captions-overlay",
    ".atvwebplayersdk-captions-text",
    '.webPlayerSDKContainer [class*="captions"]',
  ],

  findTitle() {
    const sels = [
      ".atvwebplayersdk-title-text",
      '[class*="TitleContainer"] [class*="title"]',
      "h1",
    ];
    for (const sel of sels) {
      const el = document.querySelector(sel) as HTMLElement | null;
      const t = el?.textContent?.trim();
      if (t) return t;
    }
    const t = document.title
      ?.replace(/\s*\|\s*Prime Video\s*$/i, "")
      .replace(/^Watch\s+/i, "")
      .trim();
    return t || null;
  },

  subtitleSource: { kind: "network-intercept" },
};
