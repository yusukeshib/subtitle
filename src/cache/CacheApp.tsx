import { useCallback, useEffect, useMemo, useState } from "react";
import { type CacheRecord, clearAllCache, deleteCacheByKey, listCacheEntries } from "../lib/cache";
import { estimateCostUsd, formatCostUsd } from "../lib/pricing";

type Row = {
  key: string;
  title: string;
  legacy: boolean;
  pageUrl: string | null;
  lang: string | null;
  model: string;
  provider: string | null;
  translatedAt: number;
  done: number;
  total: number;
  pct: number;
  complete: boolean;
  costUsd: number | null;
};

function toRow(r: CacheRecord): Row {
  const e = r.entry;
  const done = e.cues?.length ?? 0;
  const total = e.sourceCues?.length ?? done;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const complete = e.complete !== false && done > 0;
  const legacy = !e.title && !e.pageUrl && !e.lang;
  const cost = e.usage ? estimateCostUsd(e.model, e.usage) : null;
  return {
    key: r.key,
    title: e.title ?? "(legacy entry)",
    legacy,
    pageUrl: e.pageUrl ?? null,
    lang: e.lang ?? null,
    model: e.model,
    provider: e.provider ?? null,
    translatedAt: e.translatedAt,
    done,
    total,
    pct,
    complete,
    costUsd: cost,
  };
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString();
}

export function CacheApp() {
  const [rows, setRows] = useState<Row[] | null>(null);

  const load = useCallback(async () => {
    const records = await listCacheEntries();
    const mapped = records.map(toRow);
    mapped.sort((a, b) => b.translatedAt - a.translatedAt);
    setRows(mapped);
  }, []);

  useEffect(() => {
    void load();
    const onChanged = (
      _changes: { [k: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === "local") void load();
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [load]);

  const summary = useMemo(() => {
    if (!rows) return null;
    let known = 0;
    let unknown = 0;
    let totalCost = 0;
    let inProgress = 0;
    for (const r of rows) {
      if (r.costUsd !== null) {
        known += 1;
        totalCost += r.costUsd;
      } else {
        unknown += 1;
      }
      if (!r.complete) inProgress += 1;
    }
    return { count: rows.length, known, unknown, totalCost, inProgress };
  }, [rows]);

  const handleDelete = async (key: string) => {
    await deleteCacheByKey(key);
    await load();
  };

  const handleClearAll = async () => {
    if (!rows || rows.length === 0) return;
    const ok = window.confirm(
      `Delete all ${rows.length} cached translations? This can't be undone.`,
    );
    if (!ok) return;
    await clearAllCache();
    await load();
  };

  if (!rows) {
    return (
      <div className="page">
        <h1>Cache</h1>
        <p className="sub">Loading…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Cache</h1>
      <p className="sub">
        Translations stored in chrome.storage.local. Cost is an estimate from per-model rates;
        OpenRouter entries use the provider-reported cost when available.
      </p>

      {summary && (
        <div className="summary">
          <div className="card">
            <div className="label">Entries</div>
            <div className="value">{summary.count}</div>
          </div>
          <div className="card">
            <div className="label">In progress</div>
            <div className="value">{summary.inProgress}</div>
          </div>
          <div className="card">
            <div className="label">Estimated total</div>
            <div className="value">{formatCostUsd(summary.totalCost)}</div>
          </div>
          <div className="card">
            <div className="label">Cost unknown</div>
            <div className="value">{summary.unknown}</div>
          </div>
        </div>
      )}

      <div className="toolbar">
        <span className="count">
          {rows.length === 0
            ? "No cached translations yet."
            : `${rows.length} entr${rows.length === 1 ? "y" : "ies"}`}
        </span>
        {rows.length > 0 && (
          <button type="button" onClick={handleClearAll}>
            Clear all
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          Translate a Prime Video subtitle track and it will show up here.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Lang</th>
              <th>Progress</th>
              <th>Cost (est.)</th>
              <th>Translated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className={`title${r.legacy ? " legacy" : ""}`}>
                  {r.pageUrl ? (
                    <a href={r.pageUrl} target="_blank" rel="noopener">
                      {r.title}
                    </a>
                  ) : (
                    r.title
                  )}
                  <div className="meta">
                    {r.model}
                    {r.provider ? ` · ${r.provider}` : ""}
                    {!r.complete ? " · " : ""}
                    {!r.complete && <span className="pill partial">partial</span>}
                  </div>
                </td>
                <td>{r.lang ?? "—"}</td>
                <td>
                  <div className="progress-cell">
                    <div className={`bar${r.complete ? " complete" : ""}`}>
                      <div style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="pct">{r.pct}%</span>
                  </div>
                </td>
                <td className="cost">{formatCostUsd(r.costUsd)}</td>
                <td>{formatDate(r.translatedAt)}</td>
                <td>
                  <button
                    type="button"
                    className="delete-btn"
                    title="Delete"
                    onClick={() => void handleDelete(r.key)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
