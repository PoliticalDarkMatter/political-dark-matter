"use client";

import { useState } from "react";
import type { CaptionRecommendation, CaptionRisk } from "@/lib/image-reaction-simulator/types";
import { riskColor, SectionHeading } from "@/components/reaction-lab/primitives";

function copyText(t: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(t).catch(() => {});
}

export function CaptionRoom(p: { recommendations: CaptionRecommendation[]; risks: CaptionRisk[] }) {
  const [copied, setCopied] = useState<number | null>(null);
  if (p.recommendations.length === 0) return null;

  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="✍️" title="Caption Room" subtitle="11 wariantów podpisu, każdy oceniony pod kątem ryzyka i wzmocnienia przekazu" />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10, marginBottom: p.risks.length > 0 ? 14 : 0 }}>
          {p.recommendations.map((c, i) => {
            const color = riskColor(c.risk);
            return (
              <div key={c.type} className="pdm-heat-cell" style={{ borderLeft: `3px solid ${color}88` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.03em" }}>{c.label}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color }}>{c.risk}/100</span>
                </div>
                <div style={{ fontSize: 12.5, color: "#e2e8f0", lineHeight: 1.45, marginBottom: 6 }}>„{c.text}"</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  {c.strengthensImage && <span style={{ fontSize: 9, color: "#4ade80", background: "rgba(74,222,128,0.1)", padding: "1px 7px", borderRadius: 8 }}>wzmacnia</span>}
                  {c.disarmsRisk && <span style={{ fontSize: 9, color: "#4ade80", background: "rgba(74,222,128,0.1)", padding: "1px 7px", borderRadius: 8 }}>rozbraja ryzyko</span>}
                  {c.mayCreateNewProblem && <span style={{ fontSize: 9, color: "#f87171", background: "rgba(248,113,113,0.1)", padding: "1px 7px", borderRadius: 8 }}>nowe ryzyko</span>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 9.5, color: "#64748b" }}>ton: {c.tone}</span>
                  <button
                    type="button"
                    onClick={() => { copyText(c.text); setCopied(i); setTimeout(() => setCopied((v) => (v === i ? null : v)), 1500); }}
                    className="pdm-btn-square"
                    style={{ fontSize: 9.5, padding: "3px 8px", borderRadius: 6, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: "#7dd3fc", cursor: "pointer" }}
                  >
                    {copied === i ? "Skopiowano" : "Kopiuj"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {p.risks.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 6 }}>Czego unikać w podpisie</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {p.risks.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: "#fca5a5", padding: "6px 10px", background: "rgba(248,113,113,0.06)", borderRadius: 6, borderLeft: "2px solid rgba(248,113,113,0.4)" }}>
                  <strong>{r.avoid}</strong> — <span style={{ color: "#94a3b8" }}>{r.why}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
