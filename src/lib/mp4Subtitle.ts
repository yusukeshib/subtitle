// Prime Video's DASH-segmented TTML subtitles ship as a fragmented MP4 whose
// `mdat` boxes each contain a complete, self-styled TTML document covering
// one time slice of the episode. Timings are absolute (from period start), so
// merging is just: extract every embedded `<tt>...</tt>`, grab the `<p>`
// cues, and stitch them into one synthetic TTML document for `parseTtml`.
//
// We deliberately do NOT parse MP4 boxes; scanning the raw bytes as UTF-8
// catches every TTML fragment without an MP4 box walker, and the TTML
// payloads are plain ASCII in practice.

const TT_DOC_RE = /<tt\b[^>]*>[\s\S]*?<\/tt>/g;
const P_ELEMENT_RE = /<p\b[\s\S]*?<\/p>/g;

function cueKey(p: string): string {
  const begin = /begin="([^"]+)"/.exec(p)?.[1] ?? "";
  const end = /end="([^"]+)"/.exec(p)?.[1] ?? "";
  const text = p.replace(/<[^>]+>/g, "");
  return `${begin}|${end}|${text}`;
}

/**
 * Merge the TTML fragments embedded in a Prime Video `_text_N.mp4` into a
 * single TTML document that {@link import("./ttml").parseTtml} can consume.
 *
 * Each fragment is a valid `<tt>` doc with absolute begin/end clock times; we
 * concatenate their `<p>` elements into one synthetic doc and let the normal
 * TTML parser do the rest. Duplicate cues (if Prime Video ever starts
 * overlapping segment boundaries) are dropped.
 */
export function mergeMp4TtmlFragments(buf: ArrayBuffer): string {
  const src = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(buf));
  const seen = new Set<string>();
  const ps: string[] = [];
  for (const doc of src.match(TT_DOC_RE) ?? []) {
    for (const p of doc.match(P_ELEMENT_RE) ?? []) {
      const key = cueKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      ps.push(p);
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?><tt xmlns="http://www.w3.org/ns/ttml"><body><div>${ps.join("")}</div></body></tt>`;
}

/** Matches Prime Video's subtitle segment naming: `{uuid}_text_{N}.mp4`. */
export const DASH_TEXT_MP4_RE = /_text_\d+\.mp4(?:\?|$)/i;
