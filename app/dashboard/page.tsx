"use client";

import { useState, useEffect, useCallback } from "react";

// ── Typy ────────────────────────────────────────────────────────
type Sent = "positive" | "negative" | "neutral";
type QueryMode = string;

interface Article {
  id: string; title: string; url: string;
  source: string; publishedAt: string; sentiment: Sent;
}
interface EntityInfo {
  name: string; count: number;
  sentimentBreakdown: { positive: number; negative: number; neutral: number };
  dominantSentiment: Sent;
}
interface NarrativeCluster {
  label: string; icon: string; count: number; percentage: number;
  dominantSentiment: Sent;
  topArticles: Array<{ title: string; url: string; source: string }>;
}
interface TimelineItem { hour: string; count: number }
interface FeedData {
  articles: Article[]; total: number; totalAvailable: number;
  bySource: Record<string, number>;
  sentimentCounts: { positive: number; negative: number; neutral: number };
  entities: EntityInfo[]; narratives: NarrativeCluster[];
  timeline: TimelineItem[];
  query: string; period: string; searchMode: string;
  searchInfo: string | null; rssNote: string | null;
  fetchedAt: string;
}
interface SavedSearch { label: string; chips: string[]; period: string }

// ── Mobile hook ──────────────────────────────────────────────────
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );
  useEffect(function () {
    function handler() { setIsMobile(window.innerWidth < 768); }
    window.addEventListener("resize", handler);
    return function () { window.removeEventListener("resize", handler); };
  }, []);
  return isMobile;
}

// ── Stałe ────────────────────────────────────────────────────────
const TIME_FILTERS = [
  { value: "1h",     label: "1h" },
  { value: "24h",    label: "24h" },
  { value: "7d",     label: "7 dni" },
  { value: "30d",    label: "30 dni" },
  { value: "1y",     label: "Rok" },
  { value: "custom", label: "Zakres" },
];
const QUERY_MODES = [
  { value: "podmiot",  label: "Podmiot",  hint: 'np. "Tusk", "NBP"',         desc: "Kto? — profil aktora narracji" },
  { value: "zdarzenie",label: "Zdarzenie",hint: 'np. "strajk pielęgniarek"', desc: "Co? — analiza zdarzenia" },
  { value: "temat",    label: "Temat",    hint: 'np. "inflacja", "ukraina"',  desc: "O czym? — przegląd tematyczny" },
];

const SENT_COLOR: Record<string, string> = {
  positive: "#16a34a", negative: "#dc2626", neutral: "#94a3b8",
};
const SENT_BG: Record<string, string> = {
  positive: "rgba(22,163,74,0.08)", negative: "rgba(220,38,38,0.08)", neutral: "rgba(148,163,184,0.06)",
};
const SENT_LABEL: Record<string, string> = {
  positive: "Pozytywny", negative: "Negatywny", neutral: "Neutralny",
};

// ── DonutChart ───────────────────────────────────────────────────
function DonutChart(p: { pos: number; neg: number; neu: number }) {
  const total = p.pos + p.neg + p.neu;
  const denom = total === 0 ? 1 : total;
  const R = 38; const C = 2 * Math.PI * R;
  const posA = (p.pos / denom) * C;
  const negA = (p.neg / denom) * C;
  const neuA = (p.neu / denom) * C;
  if (total === 0) {
    return (
      <svg viewBox="0 0 100 100" style={{ width: 90, height: 90 }}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="#f1f5f9" strokeWidth="12" />
        <text x="50" y="54" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="bold">0</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" style={{ width: 90, height: 90 }}>
      <circle cx="50" cy="50" r={R} fill="none" stroke="#16a34a" strokeWidth="12"
        strokeDasharray={posA + " " + (C - posA)} strokeDashoffset={C} transform="rotate(-90 50 50)" />
      <circle cx="50" cy="50" r={R} fill="none" stroke="#dc2626" strokeWidth="12"
        strokeDasharray={negA + " " + (C - negA)} strokeDashoffset={C - posA} transform="rotate(-90 50 50)" />
      <circle cx="50" cy="50" r={R} fill="none" stroke="#cbd5e1" strokeWidth="12"
        strokeDasharray={neuA + " " + (C - neuA)} strokeDashoffset={C - posA - negA} transform="rotate(-90 50 50)" />
      <text x="50" y="47" textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="bold">{total}</text>
      <text x="50" y="59" textAnchor="middle" fill="#94a3b8" fontSize="7">artykułów</text>
    </svg>
  );
}

// ── TimelineBar ──────────────────────────────────────────────────
function TimelineBar(p: { data: TimelineItem[] }) {
  if (!p.data || p.data.length === 0) {
    return <div style={{ height: 80, display: "flex", alignItems: "center", color: "#94a3b8", fontSize: 12 }}>Brak danych osi czasu</div>;
  }
  const maxVal = Math.max(...p.data.map(function (d) { return d.count; }), 1);
  const showEvery = Math.max(1, Math.ceil(p.data.length / 10));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 88, width: "100%" }}>
      {p.data.map(function (item, idx) {
        const h = Math.max(4, Math.round((item.count / maxVal) * 60));
        const showLabel = (idx % showEvery === 0) || idx === p.data.length - 1;
        return (
          <div key={item.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 8, color: "#94a3b8", marginBottom: 1 }}>{item.count > 0 ? item.count : ""}</span>
            <div
              title={item.hour + ": " + item.count + " art."}
              style={{
                width: "100%", height: h,
                background: item.count > 0 ? "linear-gradient(to top, #6366f1, #818cf8)" : "#f1f5f9",
                borderRadius: "2px 2px 0 0", cursor: "default",
              }}
            />
            <span style={{ fontSize: 8, color: showLabel ? "#94a3b8" : "transparent", whiteSpace: "nowrap", marginTop: 2 }}>
              {item.hour}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── ColumnChart ──────────────────────────────────────────────────
function ColumnChart(p: { data: Record<string, number> }) {
  const entries = Object.entries(p.data);
  if (!entries.length) return <div style={{ color: "#94a3b8", fontSize: 12 }}>Brak danych</div>;
  const maxVal = Math.max(...entries.map(function (e) { return e[1]; }), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 72 }}>
      {entries.map(function (entry) {
        const h = Math.max(4, Math.round((entry[1] / maxVal) * 60));
        return (
          <div key={entry[0]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 9, color: "#64748b" }}>{entry[1]}</span>
            <div style={{ width: "100%", height: h, background: "linear-gradient(to top, #3b82f6, #60a5fa)", borderRadius: "2px 2px 0 0" }} />
            <span style={{ fontSize: 8, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", maxWidth: 38, textOverflow: "ellipsis" }}>
              {entry[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── NarrativeBar ─────────────────────────────────────────────────
function NarrativeBar(p: { cluster: NarrativeCluster; selected: boolean; onClick: () => void }) {
  const color = SENT_COLOR[p.cluster.dominantSentiment];
  return (
    <div
      onClick={p.onClick}
      style={{
        padding: "8px 11px", borderRadius: 8, cursor: "pointer",
        background: p.selected ? "rgba(99,102,241,0.08)" : "#f8fafc",
        border: p.selected ? "1px solid #6366f1" : "1px solid #e8edf2",
        transition: "all 0.15s", marginBottom: 5,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>
          {p.cluster.icon} {p.cluster.label}
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          {p.cluster.count} ({p.cluster.percentage}%)
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "#f1f5f9", overflow: "hidden" }}>
        <div style={{ height: "100%", width: p.cluster.percentage + "%", background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── EntityRow ─────────────────────────────────────────────────────
function EntityRow(p: { entity: EntityInfo; maxCount: number; selected: boolean; onClick: () => void }) {
  const color = SENT_COLOR[p.entity.dominantSentiment];
  const bg    = SENT_BG[p.entity.dominantSentiment];
  const pct   = Math.round((p.entity.count / p.maxCount) * 100);
  const sb    = p.entity.sentimentBreakdown;
  const sbTotal = (sb.positive + sb.negative + sb.neutral) || 1;
  return (
    <div
      onClick={p.onClick}
      style={{
        padding: "7px 10px", borderRadius: 7, cursor: "pointer",
        background: p.selected ? "rgba(99,102,241,0.08)" : bg || "#fafafa",
        border: p.selected ? "1px solid #6366f1" : "1px solid #edf0f4",
        marginBottom: 4, transition: "all 0.12s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 500 }}>{p.entity.name}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: color, fontWeight: 700 }}>{p.entity.count}×</span>
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: bg, color: color, border: "1px solid " + color + "33" }}>
            {SENT_LABEL[p.entity.dominantSentiment]}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 1, marginTop: 4, height: 3, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ flex: sb.positive / sbTotal, background: "#16a34a", minWidth: sb.positive > 0 ? 2 : 0 }} />
        <div style={{ flex: sb.negative / sbTotal, background: "#dc2626", minWidth: sb.negative > 0 ? 2 : 0 }} />
        <div style={{ flex: sb.neutral  / sbTotal, background: "#cbd5e1", minWidth: sb.neutral  > 0 ? 2 : 0 }} />
      </div>
      <div style={{ height: 3, background: "#f1f5f9", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color }} />
      </div>
    </div>
  );
}

// ── ArticleCard ───────────────────────────────────────────────────
function ArticleCard(p: { article: Article }) {
  const color = SENT_COLOR[p.article.sentiment];
  const d = new Date(p.article.publishedAt);
  const timeStr = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const dateStr = d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  return (
    <a
      href={p.article.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "block", padding: "10px 12px", borderRadius: 8,
        background: "#fafafa", border: "1px solid #edf0f4",
        textDecoration: "none", transition: "border-color 0.12s", marginBottom: 6,
      }}
      onMouseEnter={function (e) { (e.currentTarget as HTMLElement).style.borderColor = "#c7d2fe"; }}
      onMouseLeave={function (e) { (e.currentTarget as HTMLElement).style.borderColor = "#edf0f4"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 7, background: "rgba(99,102,241,0.1)", color: "#4338ca", fontWeight: 600 }}>
          {p.article.source}
        </span>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>{dateStr} {timeStr}</span>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
        {p.article.title}
      </p>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
        <span style={{ fontSize: 9, color: color, fontWeight: 600 }}>{SENT_LABEL[p.article.sentiment]}</span>
      </div>
    </a>
  );
}

// ── Panel ─────────────────────────────────────────────────────────
function Panel(p: { title: string; subtitle?: string; highlight?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#ffffff",
      border: p.highlight ? "1px solid #c7d2fe" : "1px solid #e8edf2",
      borderRadius: 12, padding: "15px 15px 13px",
      boxShadow: p.highlight ? "0 0 0 3px rgba(99,102,241,0.08), 0 1px 4px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.05)",
      ...(p.style || {}),
    }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{
          margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: p.highlight ? "#4338ca" : "#64748b",
        }}>
          {p.highlight && "★ "}{p.title}
        </h3>
        {p.subtitle && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>{p.subtitle}</p>}
      </div>
      {p.children}
    </div>
  );
}

// ── Główna strona ─────────────────────────────────────────────────
export default function DashboardPage() {
  const isMobile = useIsMobile();
  const [data, setData]           = useState(null as FeedData | null);
  const [loading, setLoading]     = useState(true);
  const [hasError, setHasError]   = useState(false);
  const [period, setPeriod]       = useState("24h");
  const [fromTs, setFromTs]       = useState("");
  const [toTs, setToTs]           = useState("");
  const [mode, setMode]           = useState("temat" as QueryMode);
  const [selNarr, setSelNarr]     = useState("");
  const [selEntity, setSelEntity] = useState("");

  // Chip-based search
  const [chips, setChips]               = useState([] as string[]);
  const [chipInput, setChipInput]       = useState("");
  const [chipMode, setChipMode]         = useState("AND" as "AND" | "OR");
  const [showDropdown, setShowDropdown] = useState(false);
  const [savedSearches, setSavedSearches] = useState([] as SavedSearch[]);
  const [recentSearches, setRecentSearches] = useState([] as string[][]);
  const [starAnim, setStarAnim]         = useState(false);

  useEffect(function () {
    try {
      const saved = localStorage.getItem("ns_saved");
      if (saved) setSavedSearches(JSON.parse(saved) as SavedSearch[]);
      const recent = localStorage.getItem("ns_recent");
      if (recent) setRecentSearches(JSON.parse(recent) as string[][]);
    } catch { /* ignore */ }
  }, []);

  function buildQuery(ch?: string[]): string {
    const src = ch || chips;
    if (src.length === 0) return "";
    return src.join(chipMode === "AND" ? " " : " OR ");
  }

  function addChip(val: string) {
    const trimmed = val.replace(/,+$/, "").trim();
    if (!trimmed) return;
    setChips(function (prev) { return prev.includes(trimmed) ? prev : [...prev, trimmed]; });
    setChipInput("");
  }

  function saveCurrentSearch() {
    if (chips.length === 0) return;
    const label = chips.join(" + ");
    const entry: SavedSearch = { label, chips: [...chips], period };
    const updated = [entry, ...savedSearches.filter(function (s) { return s.label !== label; })].slice(0, 10);
    setSavedSearches(updated);
    try { localStorage.setItem("ns_saved", JSON.stringify(updated)); } catch { /* ignore */ }
    setStarAnim(true);
    setTimeout(function () { setStarAnim(false); }, 800);
  }

  function addToRecent(ch: string[]) {
    if (ch.length === 0) return;
    const key = ch.join(",");
    const updated = [ch, ...recentSearches.filter(function (r) { return r.join(",") !== key; })].slice(0, 6);
    setRecentSearches(updated);
    try { localStorage.setItem("ns_recent", JSON.stringify(updated)); } catch { /* ignore */ }
  }

  function loadSearch(loadedChips: string[], loadedPeriod?: string) {
    const p2 = loadedPeriod || period;
    setChips(loadedChips);
    setChipInput("");
    setShowDropdown(false);
    if (loadedPeriod) setPeriod(loadedPeriod);
    fetchNews(buildQuery(loadedChips), p2, undefined, undefined, mode);
  }

  const fetchNews = useCallback(function (q: string, p: string, f?: string, t?: string, autoMode?: string) {
    setLoading(true);
    setHasError(false);
    let url = "/api/news?q=" + encodeURIComponent(q) + "&period=" + p;
    if (f) url += "&from=" + encodeURIComponent(f);
    if (t) url += "&to=" + encodeURIComponent(t);
    fetch(url)
      .then(function (res) { if (!res.ok) throw new Error("bad"); return res.json(); })
      .then(function (json) {
        const fd = json as FeedData;
        setData(fd);
        if (q.trim()) {
          if (autoMode === "podmiot" && fd.entities && fd.entities.length > 0) {
            setSelEntity(fd.entities[0].name); setSelNarr("");
          } else if (autoMode === "zdarzenie" && fd.narratives && fd.narratives.length > 0) {
            setSelNarr(fd.narratives[0].label); setSelEntity("");
          } else { setSelNarr(""); setSelEntity(""); }
        }
      })
      .catch(function () { setHasError(true); })
      .finally(function () { setLoading(false); });
  }, []);

  useEffect(function () { fetchNews("", "24h"); }, [fetchNews]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (chipInput.trim()) {
      const newChips = chips.includes(chipInput.trim()) ? chips : [...chips, chipInput.trim()];
      setChips(newChips); setChipInput("");
      const q = buildQuery(newChips); addToRecent(newChips);
      fetchNews(q, period === "custom" ? "custom" : period, fromTs || undefined, toTs || undefined, mode);
      return;
    }
    const q = buildQuery(); addToRecent(chips);
    fetchNews(q, period === "custom" ? "custom" : period, fromTs || undefined, toTs || undefined, mode);
  }

  function handlePeriod(v: string) {
    setPeriod(v);
    if (v !== "custom") fetchNews(buildQuery(), v, undefined, undefined, mode);
  }

  function handleEntityClick(name: string) {
    if (selEntity === name) { setSelEntity(""); }
    else {
      setSelEntity(name); setSelNarr("");
      setChips([name]); setChipInput("");
      fetchNews(name, period, fromTs || undefined, toTs || undefined, "podmiot");
    }
  }

  function clearQuery() {
    setChips([]); setChipInput(""); setSelNarr(""); setSelEntity("");
    fetchNews("", period, fromTs || undefined, toTs || undefined);
  }

  const visibleArticles = (function () {
    if (!data) return [];
    if (selNarr && data.narratives) {
      const cluster = data.narratives.find(function (n) { return n.label === selNarr; });
      if (cluster) {
        const urls = new Set(cluster.topArticles.map(function (a) { return a.url; }));
        return data.articles.filter(function (a) { return urls.has(a.url); });
      }
    }
    return data.articles;
  })();

  const maxEntityCount = (data && data.entities && data.entities.length > 0) ? data.entities[0].count : 1;
  const currentMode = QUERY_MODES.find(function (m2) { return m2.value === mode; }) || QUERY_MODES[2];

  // Responsive grid helpers
  const col1   = "1fr";
  const col2   = isMobile ? "1fr" : "1fr 1fr";
  const col3   = isMobile ? "1fr" : "170px 1fr";
  const col4   = isMobile ? "1fr" : "260px 1fr";
  const col5   = isMobile ? "1fr" : "3fr 1fr";

  // ── Panel renderers ──────────────────────────────────────────────
  function renderSentiment() {
    if (!data) return null;
    return (
      <Panel title="Sentyment" subtitle={data.total + " wyników"}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <DonutChart pos={data.sentimentCounts.positive} neg={data.sentimentCounts.negative} neu={data.sentimentCounts.neutral} />
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 4 }}>
            {(["positive", "negative", "neutral"] as const).map(function (s) {
              return (
                <div key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: SENT_COLOR[s], flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#64748b", flex: 1 }}>{SENT_LABEL[s]}</span>
                  <span style={{ fontSize: 12, color: SENT_COLOR[s], fontWeight: 700 }}>{data.sentimentCounts[s]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </Panel>
    );
  }

  function renderTimeline(highlight?: boolean) {
    if (!data) return null;
    return (
      <Panel title="Oś czasu" subtitle="Artykuły wg godziny publikacji" highlight={highlight}>
        <TimelineBar data={data.timeline} />
      </Panel>
    );
  }

  function renderNarratives(highlight?: boolean) {
    if (!data) return null;
    return (
      <Panel
        title="Dominujące narracje"
        subtitle={selNarr ? "Filtr: " + selNarr + " — kliknij ponownie by wyczyścić" : "Kliknij narrację by filtrować artykuły"}
        highlight={highlight}
      >
        {data.narratives && data.narratives.length > 0 ? (
          <div>
            {data.narratives.map(function (cluster) {
              return (
                <NarrativeBar
                  key={cluster.label}
                  cluster={cluster}
                  selected={selNarr === cluster.label}
                  onClick={function () { setSelNarr(function (prev) { return prev === cluster.label ? "" : cluster.label; }); setSelEntity(""); }}
                />
              );
            })}
          </div>
        ) : (
          <div style={{ color: "#94a3b8", fontSize: 12, padding: "14px 0" }}>
            Brak sklasyfikowanych narracji — rozszerz zakres lub zmień zapytanie.
          </div>
        )}
      </Panel>
    );
  }

  function renderEntities(highlight?: boolean) {
    if (!data) return null;
    return (
      <Panel
        title="Aktorzy narracji"
        subtitle={selEntity ? "Wybrano: " + selEntity : "Kliknij aktora by wyszukać wzmianki"}
        highlight={highlight}
      >
        {data.entities && data.entities.length > 0 ? (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Sentyment:</span>
              {(["positive","negative","neutral"] as const).map(function(s){
                return (
                  <span key={s} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: SENT_COLOR[s] }}>
                    <div style={{ width: 8, height: 3, background: SENT_COLOR[s], borderRadius: 1 }} />
                    {s === "positive" ? "poz" : s === "negative" ? "neg" : "neu"}
                  </span>
                );
              })}
            </div>
            <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 2 }}>
              {data.entities.map(function (entity) {
                return (
                  <EntityRow
                    key={entity.name}
                    entity={entity}
                    maxCount={maxEntityCount}
                    selected={selEntity === entity.name}
                    onClick={function () { handleEntityClick(entity.name); }}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ color: "#94a3b8", fontSize: 12, padding: "14px 0" }}>
            Brak rozpoznanych aktorów (min. 2 wzmianki). Rozszerz zakres czasu lub wpisz konkretne imię/nazwisko.
          </div>
        )}
      </Panel>
    );
  }

  function renderSources() {
    if (!data) return null;
    return (
      <Panel title="Aktywność źródeł" subtitle="Pobrane artykuły">
        <ColumnChart data={data.bySource} />
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
          {Object.entries(data.bySource).map(function (entry) {
            return (
              <div key={entry[0]} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", padding: "2px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span>{entry[0]}</span>
                <span style={{ color: "#3b82f6", fontWeight: 600 }}>{entry[1]}</span>
              </div>
            );
          })}
        </div>
      </Panel>
    );
  }

  function renderArticles() {
    if (!data) return null;
    const panelTitle = selNarr ? "Artykuły — " + selNarr : selEntity ? "Artykuły — " + selEntity : "Artykuły";
    const sub = visibleArticles.length + " wyników" + (selNarr ? " w narracji" : selEntity ? " ze wzmiankami" : "");
    return (
      <Panel title={panelTitle} subtitle={sub}>
        {visibleArticles.length === 0 ? (
          <div style={{ padding: "28px 0", textAlign: "center" }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>🔍</div>
            <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Brak artykułów dla tych kryteriów.</p>
          </div>
        ) : (
          <div style={{ maxHeight: 440, overflowY: "auto", paddingRight: 2 }}>
            {visibleArticles.map(function (article) { return <ArticleCard key={article.id} article={article} />; })}
          </div>
        )}
      </Panel>
    );
  }

  function renderPanels() {
    if (!data) return null;
    if (mode === "podmiot") {
      return (
        <div>
          <div style={{ marginBottom: 12 }}>{renderEntities(true)}</div>
          <div style={{ display: "grid", gridTemplateColumns: col2, gap: 12, marginBottom: 12 }}>
            {renderNarratives()}{renderTimeline()}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: col4, gap: 12, marginBottom: 30 }}>
            {renderSources()}{renderArticles()}
          </div>
        </div>
      );
    }
    if (mode === "zdarzenie") {
      return (
        <div>
          <div style={{ marginBottom: 12 }}>{renderNarratives(true)}</div>
          <div style={{ display: "grid", gridTemplateColumns: col5, gap: 12, marginBottom: 12 }}>
            {renderTimeline(true)}{renderSentiment()}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: col2, gap: 12, marginBottom: 12 }}>
            {renderEntities()}{renderSources()}
          </div>
          <div style={{ marginBottom: 30 }}>{renderArticles()}</div>
        </div>
      );
    }
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: col3, gap: 12, marginBottom: 12 }}>
          {renderSentiment()}{renderTimeline()}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: col2, gap: 12, marginBottom: 12 }}>
          {renderNarratives()}{renderEntities()}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: col4, gap: 12, marginBottom: 30 }}>
          {renderSources()}{renderArticles()}
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div style={{ padding: isMobile ? "12px 12px" : "18px 24px", minHeight: "100%", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Status bar */}
      {data && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {QUERY_MODES.map(function (m2) {
              const active = mode === m2.value;
              return (
                <button key={m2.value} onClick={function () { setMode(m2.value); }} title={m2.desc}
                  style={{
                    padding: "4px 13px", borderRadius: 20,
                    border: active ? "1px solid #6366f1" : "1px solid #e2e8f0",
                    background: active ? "rgba(99,102,241,0.1)" : "#fff",
                    color: active ? "#4338ca" : "#64748b",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
                  }}>
                  {m2.label}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>
            {data.totalAvailable} art. · {new Date(data.fetchedAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
            {data.searchMode === "google_news" && <span style={{ color: "#6366f1", marginLeft: 6, fontWeight: 600 }}>· Google News</span>}
          </span>
        </div>
      )}

      {/* Chip Searchbar */}
      <form onSubmit={handleSearch} style={{ marginBottom: 9 }}>
        <div style={{ display: "flex", gap: 7, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <div
              style={{
                background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: 10, padding: "7px 10px",
                display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center",
                minHeight: 44, cursor: "text", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
              onClick={function () { const el = document.getElementById("chip-input"); if (el) el.focus(); }}
            >
              {chips.length > 1 && (
                <button type="button"
                  onClick={function (e) { e.stopPropagation(); setChipMode(function (prev) { return prev === "AND" ? "OR" : "AND"; }); }}
                  style={{
                    background: chipMode === "AND" ? "rgba(99,102,241,0.1)" : "rgba(234,179,8,0.12)",
                    border: chipMode === "AND" ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(234,179,8,0.4)",
                    borderRadius: 4, padding: "2px 7px",
                    color: chipMode === "AND" ? "#4338ca" : "#92400e",
                    fontSize: 9, fontWeight: 700, cursor: "pointer", letterSpacing: "0.07em", flexShrink: 0,
                  }}>
                  {chipMode}
                </button>
              )}
              {chips.map(function (chip, idx) {
                return (
                  <span key={chip + String(idx)} style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: 6, padding: "3px 5px 3px 9px",
                    fontSize: 12, color: "#4338ca", fontWeight: 500, whiteSpace: "nowrap",
                  }}>
                    {chip}
                    <button type="button"
                      onClick={function (e) { e.stopPropagation(); setChips(function (prev) { return prev.filter(function (_, i) { return i !== idx; }); }); }}
                      style={{ background: "none", border: "none", color: "#6366f1", cursor: "pointer", padding: "0 2px 0 1px", fontSize: 15, lineHeight: 1, display: "flex", alignItems: "center" }}>
                      ×
                    </button>
                  </span>
                );
              })}
              <input
                id="chip-input"
                value={chipInput}
                onChange={function (e) { setChipInput(e.target.value); }}
                onKeyDown={function (e) {
                  if ((e.key === "Enter" || e.key === ",") && chipInput.trim()) { e.preventDefault(); addChip(chipInput); }
                  else if (e.key === "Backspace" && !chipInput && chips.length > 0) { setChips(function (prev) { return prev.slice(0, -1); }); }
                  else if (e.key === "Escape") { setShowDropdown(false); }
                }}
                onFocus={function () { setShowDropdown(true); }}
                onBlur={function () { setTimeout(function () { setShowDropdown(false); }, 180); }}
                placeholder={chips.length === 0 ? currentMode.hint : "Dodaj słowo…"}
                style={{ flex: 1, minWidth: 100, background: "none", border: "none", outline: "none", color: "#0f172a", fontSize: 13, padding: "3px 0" }}
              />
            </div>

            {/* Dropdown */}
            {showDropdown && (recentSearches.length > 0 || savedSearches.length > 0) && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: 10, zIndex: 300,
                boxShadow: "0 8px 32px rgba(0,0,0,0.1)", padding: "8px 0",
              }}>
                {recentSearches.length > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "2px 12px 5px" }}>
                      Ostatnie zapytania
                    </div>
                    {recentSearches.map(function (r, idx) {
                      return (
                        <button key={String(idx)} type="button" onClick={function () { loadSearch(r); }}
                          style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                          onMouseEnter={function (e) { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
                          onMouseLeave={function (e) { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>🕐</span>
                          <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {r.map(function (c, ci) {
                              return <span key={String(ci)} style={{ background: "#f1f5f9", borderRadius: 4, padding: "1px 7px", fontSize: 11, color: "#64748b" }}>{c}</span>;
                            })}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {recentSearches.length > 0 && savedSearches.length > 0 && (
                  <div style={{ borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
                )}
                {savedSearches.length > 0 && (
                  <div>
                    <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", padding: "4px 12px 5px" }}>
                      Zapisane
                    </div>
                    {savedSearches.map(function (s, idx) {
                      return (
                        <button key={String(idx)} type="button" onClick={function () { loadSearch(s.chips, s.period); }}
                          style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                          onMouseEnter={function (e) { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
                          onMouseLeave={function (e) { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}>
                          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 12 }}>⭐</span>
                            <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {s.chips.map(function (c, ci) {
                                return <span key={String(ci)} style={{ background: "rgba(99,102,241,0.1)", borderRadius: 4, padding: "1px 7px", fontSize: 11, color: "#4338ca" }}>{c}</span>;
                              })}
                            </span>
                          </span>
                          <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 8 }}>{s.period}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Zapisz */}
          {chips.length > 0 && (
            <button type="button" onClick={saveCurrentSearch} title="Zapisz wyszukiwanie"
              style={{
                width: 44, height: 44, flexShrink: 0,
                background: starAnim ? "rgba(234,179,8,0.12)" : "#fff",
                border: starAnim ? "1px solid #f59e0b" : "1px solid #e2e8f0",
                borderRadius: 10, color: starAnim ? "#b45309" : "#94a3b8",
                fontSize: 16, cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}>⭐</button>
          )}
          {/* Wyczyść */}
          {chips.length > 0 && (
            <button type="button" onClick={clearQuery} title="Wyczyść"
              style={{
                width: 44, height: 44, flexShrink: 0,
                background: "#fff", border: "1px solid #e2e8f0",
                borderRadius: 10, color: "#94a3b8", fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}>✕</button>
          )}
          {/* Analizuj */}
          <button type="submit"
            style={{
              height: 44, padding: "0 20px", flexShrink: 0,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none", borderRadius: 10,
              color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
              whiteSpace: "nowrap",
            }}>
            Analizuj
          </button>
        </div>

        {chips.length === 0 && (
          <div style={{ fontSize: 11, color: "#cbd5e1", paddingLeft: 2, marginTop: 5 }}>
            Wpisz słowo i naciśnij{" "}
            <kbd style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 3, padding: "1px 5px", fontSize: 10, color: "#64748b" }}>Enter</kbd>
            {" "}lub{" "}
            <kbd style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 3, padding: "1px 5px", fontSize: 10, color: "#64748b" }}>,</kbd>
            {" "}by dodać tag.
          </div>
        )}
      </form>

      {/* Filtry czasu */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
        {TIME_FILTERS.map(function (f) {
          const active = period === f.value;
          return (
            <button key={f.value} onClick={function () { handlePeriod(f.value); }}
              style={{
                padding: "4px 11px", borderRadius: 20,
                border: active ? "1px solid #6366f1" : "1px solid #e2e8f0",
                background: active ? "rgba(99,102,241,0.1)" : "#fff",
                color: active ? "#4338ca" : "#64748b",
                fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s",
              }}>
              {f.label}
            </button>
          );
        })}
        {period === "custom" && (
          <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
            <input type="datetime-local" value={fromTs} onChange={function (e) { setFromTs(e.target.value); }}
              style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 7, padding: "4px 9px", color: "#0f172a", fontSize: 11, outline: "none" }} />
            <span style={{ color: "#94a3b8", fontSize: 11 }}>do</span>
            <input type="datetime-local" value={toTs} onChange={function (e) { setToTs(e.target.value); }}
              style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 7, padding: "4px 9px", color: "#0f172a", fontSize: 11, outline: "none" }} />
            <button onClick={function () { fetchNews(buildQuery(), "custom", fromTs, toTs, mode); }}
              style={{ padding: "4px 11px", background: "rgba(99,102,241,0.1)", border: "1px solid #6366f1", borderRadius: 7, color: "#4338ca", fontSize: 11, cursor: "pointer" }}>
              Szukaj
            </button>
          </div>
        )}
      </div>

      {/* Info banery */}
      {data && data.searchInfo && (
        <div style={{ marginBottom: 9, padding: "7px 12px", background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 7, fontSize: 12, color: "#4338ca", display: "flex", alignItems: "center", gap: 7 }}>
          🔍 {data.searchInfo}
        </div>
      )}
      {data && data.rssNote && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 7, fontSize: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 7 }}>
          ⚠️ {data.rssNote}
        </div>
      )}

      {/* Loading / error */}
      {loading && (
        <div style={{ padding: "70px 0", textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 26, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 13 }}>Pobieranie i analiza narracji…</div>
        </div>
      )}
      {hasError && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "#dc2626" }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 13 }}>Błąd pobierania danych.</div>
        </div>
      )}

      {/* Panele */}
      {!loading && !hasError && renderPanels()}
    </div>
  );
}
