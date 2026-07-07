"use client";

// ── Prezentacyjne klocki do wyświetlania REALNYCH danych (FeedData) ────
// Wydzielone z app/dashboard/page.tsx, żeby ten sam, sprawdzony sposób
// pokazywania realnych wyników (nie symulacji AI) dało się reużyć w
// app/reaction-check i app/image-reaction-check bez duplikowania ~300
// linii kodu wykresów. Żadna logika tu się nie zmieniła względem
// oryginału w dashboard/page.tsx — czysta relokacja.

import { useEffect, useState } from "react";
import type { Article, EntityInfo, NarrativeCluster, Sent, TimelineItem, WeightBasis } from "@/lib/dashboard-types";
import type { CrossPlatformSignal } from "@/lib/cross-platform";
import { computeSentimentTimeline } from "@/lib/dashboard-briefing";

// ── Mobile hook ──────────────────────────────────────────────────
// Ten sam wzorzec co (dotąd lokalny) hook w app/dashboard/page.tsx —
// tu wydzielony, żeby app/reaction-check i app/image-reaction-check
// mogły go reużyć bez kopiowania.
export function useIsMobile(): boolean {
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

export const SENT_COLOR: Record<string, string> = {
  positive: "#4ade80", negative: "#f87171", neutral: "#94a3b8",
};
export const SENT_BG: Record<string, string> = {
  positive: "rgba(74,222,128,0.1)", negative: "rgba(248,113,113,0.1)", neutral: "rgba(148,163,184,0.07)",
};
export const SENT_LABEL: Record<string, string> = {
  positive: "Pozytywny", negative: "Negatywny", neutral: "Neutralny",
};

// ── Etykieta wagi artykułu ─────────────────────────────────────────
// Rozróżnia w interfejsie realny pomiar od szacunku — zgodnie z zasadą
// "fakt oddzielony od hipotezy". Patrz lib/domain-authority.ts (serwer)
// dla pełnej metodologii.
export const WEIGHT_BASIS_META: Record<WeightBasis, { label: string; color: string; bg: string }> = {
  tranco:             { label: "ranga domeny (Tranco)",       color: "#7dd3fc", bg: "rgba(56,189,248,0.1)" },
  editorial_override: { label: "wyjątek redakcyjny",           color: "#c4b5fd", bg: "rgba(167,139,250,0.1)" },
  social_real:        { label: "realny pomiar",                color: "#4ade80", bg: "rgba(74,222,128,0.1)" },
  social_estimate:    { label: "szacunek",                     color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  unknown:            { label: "brak danych",                  color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

export function VelocityBadge(p: { velocity?: number | null }) {
  if (p.velocity == null) return null;
  const up = p.velocity > 0;
  const flat = p.velocity === 0;
  const color = flat ? "#94a3b8" : up ? "#f87171" : "#4ade80";
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color, marginLeft: 6 }}>
      {flat ? "→ 0%" : up ? `↑ +${p.velocity}%` : `↓ ${p.velocity}%`}
    </span>
  );
}

export function WeightBadge(p: { weight?: number; basis?: WeightBasis; explain?: string }) {
  if (p.weight == null) return null;
  const meta = WEIGHT_BASIS_META[p.basis ?? "unknown"];
  return (
    <span
      title={p.explain || "Waga zasięgu — brak szczegółów metody"}
      style={{
        fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 4,
        background: meta.bg, color: meta.color, marginLeft: 2,
        display: "inline-flex", alignItems: "center", gap: 3, cursor: "help",
      }}
    >
      waga {p.weight.toFixed(1)} · {meta.label}
    </span>
  );
}

// ── Panel ─────────────────────────────────────────────────────────
export function Panel(p: { title: string; subtitle?: string; highlight?: boolean; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className={"pdm-panel" + (p.highlight ? " pdm-panel-highlight" : "")}
      style={{ padding: "16px 16px 14px", ...(p.style || {}) }}
    >
      <div style={{ marginBottom: 11, position: "relative", zIndex: 1 }}>
        <h3 style={{
          margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: p.highlight ? "#7dd3fc" : "#94a3b8",
          display: "flex", alignItems: "center", gap: 5,
        }}>
          {p.highlight && <span style={{ color: "#facc15" }}>★</span>}{p.title}
        </h3>
        {p.subtitle && <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b" }}>{p.subtitle}</p>}
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>{p.children}</div>
    </div>
  );
}

// ── DonutChart ───────────────────────────────────────────────────
export function DonutChart(p: { pos: number; neg: number; neu: number }) {
  const total = p.pos + p.neg + p.neu;
  const denom = total === 0 ? 1 : total;
  const R = 38; const C = 2 * Math.PI * R;
  const posA = (p.pos / denom) * C;
  const negA = (p.neg / denom) * C;
  const neuA = (p.neu / denom) * C;
  if (total === 0) {
    return (
      <svg viewBox="0 0 100 100" style={{ width: 90, height: 90 }}>
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="12" />
        <text x="50" y="54" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="bold">0</text>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" style={{ width: 90, height: 90 }}>
      <circle cx="50" cy="50" r={R} fill="none" stroke="#4ade80" strokeWidth="12"
        strokeDasharray={posA + " " + (C - posA)} strokeDashoffset={C} transform="rotate(-90 50 50)" />
      <circle cx="50" cy="50" r={R} fill="none" stroke="#f87171" strokeWidth="12"
        strokeDasharray={negA + " " + (C - negA)} strokeDashoffset={C - posA} transform="rotate(-90 50 50)" />
      <circle cx="50" cy="50" r={R} fill="none" stroke="#475569" strokeWidth="12"
        strokeDasharray={neuA + " " + (C - neuA)} strokeDashoffset={C - posA - negA} transform="rotate(-90 50 50)" />
      <text x="50" y="47" textAnchor="middle" fill="#f1f5f9" fontSize="12" fontWeight="bold">{total}</text>
      <text x="50" y="59" textAnchor="middle" fill="#94a3b8" fontSize="7">artykułów</text>
    </svg>
  );
}

// ── TimelineBar ──────────────────────────────────────────────────
// Opcjonalny sentimentByHour dokłada cienki pasek składu sentymentu pod
// słupkiem wolumenu — ta sama oś X (klucz "HH:00"), liczona client-side
// w lib/dashboard-briefing.ts z tego samego zbioru artykułów, więc jest
// spójna 1:1 z liczbami w panelu "Sentyment".
export function TimelineBar(p: { data: TimelineItem[]; sentimentByHour?: Map<string, { positive: number; negative: number; neutral: number }> }) {
  if (!p.data || p.data.length === 0) {
    return <div style={{ height: 80, display: "flex", alignItems: "center", color: "#94a3b8", fontSize: 12 }}>Brak danych osi czasu</div>;
  }
  const maxVal = Math.max(...p.data.map(function (d) { return d.count; }), 1);
  const showEvery = Math.max(1, Math.ceil(p.data.length / 10));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 96, width: "100%" }}>
      {p.data.map(function (item, idx) {
        const h = Math.max(4, Math.round((item.count / maxVal) * 60));
        const showLabel = (idx % showEvery === 0) || idx === p.data.length - 1;
        const sb = p.sentimentByHour?.get(item.hour);
        const sbTotal = sb ? sb.positive + sb.negative + sb.neutral : 0;
        return (
          <div key={item.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 8, color: "#94a3b8", marginBottom: 1 }}>{item.count > 0 ? item.count : ""}</span>
            <div
              title={item.hour + ": " + item.count + " art."}
              style={{
                width: "100%", height: h,
                background: item.count > 0 ? "linear-gradient(to top, #2563eb, #38bdf8)" : "rgba(255,255,255,0.06)",
                borderRadius: "2px 2px 0 0", cursor: "default",
                boxShadow: item.count > 0 ? "0 0 10px rgba(56,189,248,0.35)" : "none",
              }}
            />
            {sb && sbTotal > 0 && (
              <div title={`sentyment o ${item.hour}: ${sb.positive} poz / ${sb.negative} neg / ${sb.neutral} neu`} style={{ display: "flex", width: "100%", height: 3, borderRadius: 1, overflow: "hidden" }}>
                <div style={{ flex: sb.positive / sbTotal, background: "#4ade80", minWidth: sb.positive > 0 ? 1 : 0 }} />
                <div style={{ flex: sb.negative / sbTotal, background: "#f87171", minWidth: sb.negative > 0 ? 1 : 0 }} />
                <div style={{ flex: sb.neutral / sbTotal, background: "#475569", minWidth: sb.neutral > 0 ? 1 : 0 }} />
              </div>
            )}
            <span style={{ fontSize: 8, color: showLabel ? "#94a3b8" : "transparent", whiteSpace: "nowrap", marginTop: 2 }}>
              {item.hour}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Wrapper wygodny dla wywołujących — liczy sentymentByHour z articles i
// renderuje Panel + TimelineBar w jednym, tak jak robił to dashboard.
export function TimelinePanel(p: { articles: Article[]; timeline: TimelineItem[]; highlight?: boolean }) {
  const sentByHour = new Map(computeSentimentTimeline(p.articles).map(function (pt) {
    return [pt.hour, { positive: pt.positive, negative: pt.negative, neutral: pt.neutral }] as const;
  }));
  return (
    <Panel title="Oś czasu" subtitle="Wolumen i skład sentymentu wg godziny publikacji" highlight={p.highlight}>
      <TimelineBar data={p.timeline} sentimentByHour={sentByHour} />
    </Panel>
  );
}

// ── ColumnChart ──────────────────────────────────────────────────
export function ColumnChart(p: { data: Record<string, number> }) {
  const entries = Object.entries(p.data).sort(function (a, b) { return b[1] - a[1]; });
  if (!entries.length) return <div style={{ color: "#94a3b8", fontSize: 12 }}>Brak danych</div>;
  const maxVal = Math.max(...entries.map(function (e) { return e[1]; }), 1);
  const total = entries.reduce(function (s, e) { return s + e[1]; }, 0) || 1;
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 78 }}>
      {entries.map(function (entry) {
        const h = Math.max(4, Math.round((entry[1] / maxVal) * 56));
        const share = Math.round((entry[1] / total) * 100);
        return (
          <div key={entry[0]} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 9, color: "#94a3b8" }}>{entry[1]}</span>
            <div style={{ width: "100%", height: h, background: "linear-gradient(to top, #7c3aed, #a78bfa)", borderRadius: "2px 2px 0 0", boxShadow: "0 0 10px rgba(167,139,250,0.3)" }} />
            <span style={{ fontSize: 8, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", maxWidth: 38, textOverflow: "ellipsis" }}>
              {entry[0]}
            </span>
            <span style={{ fontSize: 8, color: "#a78bfa", fontWeight: 700 }}>{share}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ── NarrativeBar ─────────────────────────────────────────────────
export function NarrativeBar(p: { cluster: NarrativeCluster; selected?: boolean; onClick?: () => void }) {
  const color = SENT_COLOR[p.cluster.dominantSentiment];
  return (
    <div
      onClick={p.onClick}
      style={{
        padding: "8px 11px", borderRadius: 8, cursor: p.onClick ? "pointer" : "default",
        background: p.selected ? "rgba(56,189,248,0.1)" : "rgba(255,255,255,0.03)",
        border: p.selected ? "1px solid rgba(56,189,248,0.5)" : "1px solid rgba(148,163,184,0.12)",
        transition: "all 0.15s", marginBottom: 5,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500 }}>
          {p.cluster.icon} {p.cluster.label}
        </span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>
          {p.cluster.count} ({p.cluster.percentage}%)
          <VelocityBadge velocity={p.cluster.velocity} />
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: p.cluster.percentage + "%", background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

// ── EntityRow ─────────────────────────────────────────────────────
// narrativeTags: wynik narrativesForEntity() z lib/dashboard-briefing.ts —
// sygnał częściowy (dopasowanie po topArticles danej narracji), nie pełna
// klasyfikacja, stąd opisane w UI jako "m.in." (patrz komentarz w funkcji).
export function EntityRow(p: { entity: EntityInfo; maxCount: number; selected?: boolean; onClick?: () => void; narrativeTags?: string[] }) {
  const color = SENT_COLOR[p.entity.dominantSentiment];
  const bg    = SENT_BG[p.entity.dominantSentiment];
  const pct   = Math.round((p.entity.count / p.maxCount) * 100);
  const sb    = p.entity.sentimentBreakdown;
  const sbTotal = (sb.positive + sb.negative + sb.neutral) || 1;
  const tags  = p.narrativeTags ?? [];
  return (
    <div
      onClick={p.onClick}
      style={{
        padding: "7px 10px", borderRadius: 7, cursor: p.onClick ? "pointer" : "default",
        background: p.selected ? "rgba(56,189,248,0.1)" : bg || "rgba(255,255,255,0.03)",
        border: p.selected ? "1px solid rgba(56,189,248,0.5)" : "1px solid rgba(148,163,184,0.1)",
        marginBottom: 4, transition: "all 0.12s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 500 }}>{p.entity.name}</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: color, fontWeight: 700 }}>{p.entity.count}×</span>
          <VelocityBadge velocity={p.entity.velocity} />
          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: bg, color: color, border: "1px solid " + color + "33" }}>
            {SENT_LABEL[p.entity.dominantSentiment]}
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 1, marginTop: 4, height: 3, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ flex: sb.positive / sbTotal, background: "#4ade80", minWidth: sb.positive > 0 ? 2 : 0 }} />
        <div style={{ flex: sb.negative / sbTotal, background: "#f87171", minWidth: sb.negative > 0 ? 2 : 0 }} />
        <div style={{ flex: sb.neutral  / sbTotal, background: "#475569", minWidth: sb.neutral  > 0 ? 2 : 0 }} />
      </div>
      <div style={{ height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
        <div style={{ height: "100%", width: pct + "%", background: color }} />
      </div>
      {tags.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
          <span style={{ fontSize: 9, color: "#64748b" }}>w narracjach m.in.:</span>
          {tags.slice(0, 3).map(function (t) {
            return (
              <span key={t} style={{ fontSize: 9.5, fontWeight: 600, color: "#7dd3fc", background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)", borderRadius: 8, padding: "1px 7px" }}>
                {t}
              </span>
            );
          })}
          {tags.length > 3 && <span style={{ fontSize: 9, color: "#64748b" }}>+{tags.length - 3}</span>}
        </div>
      )}
    </div>
  );
}

// ── ArticleCard ───────────────────────────────────────────────────
export function ArticleCard(p: { article: Article }) {
  const color = SENT_COLOR[p.article.sentiment];
  const d = new Date(p.article.publishedAt);
  const timeStr = d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  const dateStr = d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  return (
    <a
      href={p.article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="pdm-article-card"
      style={{
        display: "block", padding: "11px 13px 11px 15px", borderRadius: 10,
        background: "linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))",
        border: "1px solid rgba(148,163,184,0.12)", borderLeft: "3px solid " + color + "80",
        textDecoration: "none", marginBottom: 7,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 7, background: "rgba(56,189,248,0.12)", color: "#7dd3fc", fontWeight: 600 }}>
          {p.article.source}
        </span>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>{dateStr} {timeStr}</span>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1", lineHeight: 1.45 }}>
        {p.article.title}
      </p>
      <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
        <span style={{ fontSize: 9, color: color, fontWeight: 600 }}>{SENT_LABEL[p.article.sentiment]}</span>
        {p.article.enriched && (
          <span title="Sentyment liczony z pełnej treści artykułu, nie tylko tytułu" style={{ fontSize: 8, color: "#a78bfa", background: "rgba(167,139,250,0.12)", borderRadius: 4, padding: "1px 5px", marginLeft: 2 }}>
            📄 pełna treść
          </span>
        )}
        <WeightBadge weight={p.article.weight} basis={p.article.weightBasis} explain={p.article.weightExplain} />
      </div>
    </a>
  );
}

// ── CrossPlatformPanel ────────────────────────────────────────────
// Pokazuje sygnały korelacji między platformami (lib/cross-platform.ts) —
// temat/nazwisko, które pojawia się NIEZALEŻNIE na kilku różnych
// platformach naraz. Nigdzie wcześniej nie było to renderowane w UI
// (buildFeed to liczyło, ale dashboard tego nie pokazywał) — dla modułów
// "Reakcja na..." to szczególnie wartościowe: wielopłatformowe pokrycie
// jest mocniejszym dowodem na to, że coś REALNIE się wydarzyło, niż samo
// wystąpienie w jednym źródle.
export function CrossPlatformPanel(p: { signals: CrossPlatformSignal[] | undefined }) {
  const signals = p.signals ?? [];
  return (
    <Panel
      title="Sygnały międzyplatformowe"
      subtitle={signals.length > 0 ? "Tematy potwierdzone niezależnie na kilku platformach naraz" : undefined}
    >
      {signals.length === 0 ? (
        <div style={{ color: "#94a3b8", fontSize: 12, padding: "8px 0" }}>
          Brak tematów potwierdzonych na co najmniej 2 różnych platformach — sygnał albo nie jest jeszcze wystarczająco szeroki, albo cała aktywność skupia się w jednym miejscu.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {signals.map((s) => (
            <div key={s.keyword} style={{ padding: "8px 11px", borderRadius: 8, background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{s.keyword}</span>
                <span style={{ fontSize: 10.5, color: "#c4b5fd" }}>{s.articleCount}× · waga {s.totalWeight}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {s.platforms.map((pl) => (
                  <span key={pl} style={{ fontSize: 9.5, fontWeight: 700, color: "#a78bfa", background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 8, padding: "1px 7px" }}>
                    {pl}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export type { Sent };
