import type { StateSnapshot } from "../types";

type Props = {
  snapshot: StateSnapshot | null;
  reachable: boolean;
  language: string;
};

type View = {
  dotClass: "idle" | "active" | "error";
  label: string;
  progressPct: number | null;
  errorMessage: string | null;
  title: string | null;
};

function deriveView(snapshot: StateSnapshot, language: string): View {
  if (!snapshot.enabled) {
    return {
      dotClass: "idle",
      label: "Auto-translate is off.",
      progressPct: null,
      errorMessage: null,
      title: snapshot.title,
    };
  }
  const t = snapshot.translation;
  if (t.phase === "error") {
    return {
      dotClass: "error",
      label: "Something went wrong.",
      progressPct: null,
      errorMessage: t.error,
      title: snapshot.title,
    };
  }
  if (t.phase === "translating") {
    const p = t.progress;
    const done = p?.done ?? 0;
    const total = p?.total ?? 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      dotClass: "active",
      label: `Translating… ${done}/${total || "?"} (${pct}%)`,
      progressPct: pct,
      errorMessage: null,
      title: snapshot.title,
    };
  }
  if (t.phase === "complete") {
    return {
      dotClass: "active",
      label: `${language} subtitles ready.`,
      progressPct: null,
      errorMessage: null,
      title: snapshot.title,
    };
  }
  if (snapshot.hasSubtitle) {
    return {
      dotClass: "active",
      label: "Subtitle track detected.",
      progressPct: null,
      errorMessage: null,
      title: snapshot.title,
    };
  }
  return {
    dotClass: "active",
    label: "Waiting for a subtitle track…",
    progressPct: null,
    errorMessage: null,
    title: snapshot.title,
  };
}

export function StatusRow({ snapshot, reachable, language }: Props) {
  if (!reachable) {
    return (
      <div className="status-row">
        <span className="dot idle" />
        <span>Open a Prime Video page to use Jimaku.</span>
      </div>
    );
  }
  if (!snapshot) {
    return (
      <div className="status-row">
        <span className="dot idle" />
        <span>Checking…</span>
      </div>
    );
  }
  const v = deriveView(snapshot, language);
  return (
    <>
      <div className="status-row">
        <span className={`dot ${v.dotClass}`} />
        <span>{v.label}</span>
      </div>
      {v.title ? (
        <p className="sub" style={{ margin: "-4px 0 10px" }}>
          {v.title}
        </p>
      ) : null}
      {v.progressPct !== null ? (
        <div className="bar">
          <div style={{ width: `${v.progressPct}%` }} />
        </div>
      ) : null}
      {v.errorMessage ? <p className="err">{v.errorMessage}</p> : null}
    </>
  );
}
