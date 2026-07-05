"use client";

import type { FeedData, Sent } from "@/lib/dashboard-types";
import { buildBriefingSummary, computeMomentum, dominantSentiment } from "@/lib/dashboard-briefing";

const SENT_COLOR: Record<Sent, string> = { positive: "#4ade80", negative: "#f87171", neutral: "#94a3b8" };
const SENT_LABEL: Record<Sent, string> = { positive: "Pozytywny", negative: "Negatywny", neutral: "Neutralny" };

function Kpi(p: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ flex: "1 1 150px", minWidth: 130 }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>{p.label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: p.accent ?? "#f1f5f9", lineHeight: 1.05 }}>{p.value}</div>
      {p.sub && <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>{p.sub}</div>}
    </div>
  );
}

export function BriefingHero(p: { data: FeedData }) {
  const { data } = p;
  const summary = buildBriefingSummary(data);
  const { sentiment, pct } = dominantSentiment(data.sentimentCounts);
  const momentum = computeMomentum(data.entities, data.narratives, 5);
  const sourceCount = Object.keys(data.bySource || {}).length;

  return (
    <div className="pdm-panel pdm-panel-highlight" style={{ padding: "20px 22px", marginBottom: 14 }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7dd3fc" }}>📋 Bryfing sytuacyjny</span>
          <span style={{ fontSize: 10.5, color: "#64748b" }}>{new Date(data.fetchedAt).toLocaleString("pl-PL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        <p style={{ margin: "0 0 18px", fontSize: 14.5, lineHeight: 1.6, color: "#e2e8f0", maxWidth: 900 }}>{summary}</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, paddingBottom: 16, marginBottom: 16, borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
          <Kpi label="Materiały" value={String(data.total)} sub={`z ${data.totalAvailable} dostępnych`} />
          <Kpi label="Ważony zasięg" value={data.totalWeightedReach ? data.totalWeightedReach.toFixed(0) : "—"} sub="suma wag artykułów" />
          <Kpi label="Dominujący sentyment" value={`${pct}%`} sub={SENT_LABEL[sentiment]} accent={SENT_COLOR[sentiment]} />
          <Kpi label="Aktywne źródła" value={String(sourceCount)} sub={`${data.narratives?.length ?? 0} narracji · ${data.entities?.length ?? 0} aktorów`} />
        </div>

        {momentum.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 8 }}>⚡ Co przyspiesza</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {momentum.map((m, i) => {
                const up = m.velocity > 0;
                const color = up ? "#f87171" : "#4ade80";
                return (
                  <span
                    key={i}
                    title={`${m.type === "narracja" ? "Narracja" : "Aktor"}: ${m.label} — ${m.count}× wzmianek`}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700,
                      padding: "4px 11px", borderRadius: 20, color, background: color + "14", border: `1px solid ${color}44`,
                    }}
                  >
                    {up ? "↑" : "↓"} {m.label}
                    <span style={{ color: "#64748b", fontWeight: 500 }}>({m.type})</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
