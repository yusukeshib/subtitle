import { DASH_TEXT_MP4_RE, mergeMp4TtmlFragments } from "../lib/mp4Subtitle";
import { loadCues } from "../lib/subtitle";
import type { Cue } from "../types";
import { normalizeCueText } from "./cueList";
import { nativeCaptionEl } from "./overlay";

type Candidate = { url: string; cues: Cue[] | null };

/**
 * Pick the "current" subtitle track.
 *
 * Prime Video fetches several subtitle tracks in parallel at session start
 * (primary + other languages). We can't tell which is active from the URL
 * alone — they're opaque UUIDs — so we prefetch each candidate's cues and:
 *
 *   1. If the native caption DOM text matches one of the candidates' source
 *      cues (verbatim, after normalization), use that. This is the
 *      authoritative signal.
 *   2. Otherwise, once all candidates finish loading, pick the one with the
 *      most cues — ancillary forced-narrative tracks have a handful; the
 *      main episode track has hundreds.
 *
 * `onResolved` fires exactly once per URL change. Re-add (e.g. after a nav
 * `clear()`) to resolve a fresh session.
 */
async function fetchSubtitleText(url: string): Promise<string> {
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error(`Failed to fetch subtitles: ${res.status}`);
  // Prime Video now ships TTML as fragmented MP4 segments. Read the bytes and
  // extract/merge the embedded TTML so the rest of the pipeline keeps seeing
  // a plain TTML string.
  if (DASH_TEXT_MP4_RE.test(url)) {
    return mergeMp4TtmlFragments(await res.arrayBuffer());
  }
  return await res.text();
}

export type TrackResolver = {
  add(url: string): void;
  clear(): void;
  dispose(): void;
};

export type ResolverOpts = {
  /** Returns the URL already locked in (if any) so we don't re-resolve. */
  getCurrentUrl: () => string | null;
  /** Fires when a candidate wins (either by native match or most-cues fallback). */
  onResolved: (url: string) => void;
};

export function createTrackResolver(opts: ResolverOpts): TrackResolver {
  const candidates = new Map<string, Candidate>();
  let pollInterval: number | null = null;

  const stopPoll = () => {
    if (pollInterval !== null) {
      window.clearInterval(pollInterval);
      pollInterval = null;
    }
  };

  const pickByNative = (): Candidate | null => {
    const raw = nativeCaptionEl()?.textContent?.trim();
    if (!raw) return null;
    const target = normalizeCueText(raw);
    if (!target) return null;
    for (const c of candidates.values()) {
      if (!c.cues) continue;
      if (c.cues.some((x) => normalizeCueText(x.text) === target)) return c;
    }
    return null;
  };

  const consider = () => {
    const matched = pickByNative();
    if (matched && matched.url !== opts.getCurrentUrl()) {
      stopPoll();
      opts.onResolved(matched.url);
      return;
    }
    // Fallback: once all candidates have loaded, pick the one with the most
    // cues (main episode track vs ancillary forced-narrative tracks).
    if (!opts.getCurrentUrl() && candidates.size > 0) {
      const all = [...candidates.values()];
      if (all.every((c) => c.cues !== null)) {
        const best = all.reduce((a, b) => ((a.cues?.length ?? 0) >= (b.cues?.length ?? 0) ? a : b));
        if (best.cues && best.cues.length > 0) {
          stopPoll();
          opts.onResolved(best.url);
          return;
        }
      }
    }
    // Still nothing actionable — keep polling so we re-check when candidates
    // finish loading and when native captions begin appearing.
    if (!opts.getCurrentUrl() && pollInterval === null) {
      pollInterval = window.setInterval(consider, 500);
    }
  };

  return {
    add(url: string) {
      if (candidates.has(url)) return;
      const entry: Candidate = { url, cues: null };
      candidates.set(url, entry);
      void (async () => {
        try {
          const text = await fetchSubtitleText(url);
          entry.cues = await loadCues(url, text, fetchSubtitleText);
        } catch {
          entry.cues = [];
        }
        consider();
      })();
      consider();
    },
    clear() {
      candidates.clear();
      stopPoll();
    },
    dispose() {
      candidates.clear();
      stopPoll();
    },
  };
}
