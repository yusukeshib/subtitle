import { describe, expect, it } from "vitest";
import { DASH_TEXT_MP4_RE, mergeMp4TtmlFragments } from "./mp4Subtitle";
import { parseTtml } from "./ttml";

function makeMp4(fragments: string[]): ArrayBuffer {
  // Real MP4 boxes don't matter for our scanner; just emit binary-ish padding
  // between TTML fragments so tests verify the scanner handles leading/
  // interleaved non-text bytes.
  const enc = new TextEncoder();
  const pad = new Uint8Array([0, 0, 0x10, 0x6d, 0x64, 0x61, 0x74]); // fake `mdat` header bytes
  let len = 0;
  const parts: Uint8Array[] = [];
  for (const f of fragments) {
    parts.push(pad);
    const b = enc.encode(f);
    parts.push(b);
    len += pad.length + b.length;
  }
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out.buffer;
}

const TT = (body: string) =>
  `<tt xmlns="http://www.w3.org/ns/ttml" xml:lang="en"><body><div>${body}</div></body></tt>`;

describe("mergeMp4TtmlFragments", () => {
  it("concatenates cues from each embedded <tt> fragment", () => {
    const buf = makeMp4([
      TT(`<p begin="00:00:01.000" end="00:00:02.000">Alpha</p>`),
      TT(`<p begin="00:00:05.000" end="00:00:06.000">Beta</p>`),
    ]);
    const merged = mergeMp4TtmlFragments(buf);
    expect(parseTtml(merged)).toEqual([
      { start: 1, end: 2, text: "Alpha" },
      { start: 5, end: 6, text: "Beta" },
    ]);
  });

  it("drops duplicate cues across fragment boundaries", () => {
    const dup = `<p begin="00:00:02.000" end="00:00:03.000">Edge</p>`;
    const buf = makeMp4([
      TT(`<p begin="00:00:01.000" end="00:00:02.000">A</p>${dup}`),
      TT(`${dup}<p begin="00:00:04.000" end="00:00:05.000">B</p>`),
    ]);
    const cues = parseTtml(mergeMp4TtmlFragments(buf));
    expect(cues.map((c) => c.text)).toEqual(["A", "Edge", "B"]);
  });

  it("preserves <br/> and <span> inside cues", () => {
    const buf = makeMp4([
      TT(`<p begin="00:00:01" end="00:00:02">Line A<br/><span>Line B</span></p>`),
    ]);
    expect(parseTtml(mergeMp4TtmlFragments(buf))[0].text).toBe("Line A\nLine B");
  });

  it("returns an empty result for an MP4 with no TTML", () => {
    const buf = new Uint8Array([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]).buffer;
    expect(parseTtml(mergeMp4TtmlFragments(buf))).toEqual([]);
  });
});

describe("DASH_TEXT_MP4_RE", () => {
  it("matches Prime Video subtitle segment URLs", () => {
    expect(DASH_TEXT_MP4_RE.test("https://x/abc_text_1.mp4")).toBe(true);
    expect(DASH_TEXT_MP4_RE.test("https://x/abc_text_12.mp4?token=foo")).toBe(true);
  });

  it("does not match audio/video segments", () => {
    expect(DASH_TEXT_MP4_RE.test("https://x/abc_video_1.mp4")).toBe(false);
    expect(DASH_TEXT_MP4_RE.test("https://x/abc_audio_29.mp4")).toBe(false);
  });
});
