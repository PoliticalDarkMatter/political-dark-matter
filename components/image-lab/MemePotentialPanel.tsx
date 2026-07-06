"use client";

import type { MemePotential, MemeScenario } from "@/lib/image-reaction-simulator/types";
import { RiskPill, SectionHeading } from "@/components/reaction-lab/primitives";

const VIRAL_LABEL: Record<MemePotential["viralPotential"], string> = {
  pozytywny: "pozytywny", negatywny: "negatywny", oba: "oba kierunki", niski: "niski",
};
const VIRAL_COLOR: Record<MemePotential["viralPotential"], string> = {
  pozytywny: "#4ade80", negatywny: "#f87171", oba: "#fbbf24", niski: "#64748b",
};
const SCENARIO_RISK_COLOR: Record<MemeScenario["riskLevel"], string> = { niskie: "#4ade80", srednie: "#fbbf24", wysokie: "#f87171" };

export function MemePotentialPanel(p: { potential: MemePotential; scenarios: MemeScenario[] }) {
  const { potential: mp, scenarios } = p;
  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="🐸" title="Meme Potential Engine" subtitle="Czy to zdjęcie stanie się memem — i jakim" />

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", marginBottom: 14 }}>
          <RiskPill value={mp.score} label={mp.isMemeable ? `Memiczne — ${mp.score}/100` : `Niski potencjał — ${mp.score}/100`} />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: VIRAL_COLOR[mp.viralPotential] }}>
            potencjał viralowy: {VIRAL_LABEL[mp.viralPotential]}
          </span>
          {mp.canMainstream && <span style={{ fontSize: 11, color: "#fbbf24" }}>⚠ może przebić się do mainstreamu</span>}
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Najbardziej memiczny element</div>
          <p style={{ margin: 0, fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{mp.mostMemeableElement}</p>
        </div>

        {mp.possibleCaptions.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 6 }}>Możliwe podpisy mema</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {mp.possibleCaptions.map((c, i) => (
                <div key={i} style={{ fontSize: 12.5, color: "#cbd5e1", fontStyle: "italic", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6, borderLeft: "2px solid rgba(167,139,250,0.5)" }}>„{c}"</div>
              ))}
            </div>
          </div>
        )}

        {scenarios.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 6 }}>Scenariusze memów</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {scenarios.map((s, i) => {
                const color = SCENARIO_RISK_COLOR[s.riskLevel];
                return (
                  <div key={i} className="pdm-heat-cell" style={{ borderLeft: `3px solid ${color}88` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: "#a78bfa" }}>{s.format}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color, background: color + "1a", padding: "1px 7px", borderRadius: 10 }}>{s.riskLevel}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#e2e8f0", marginBottom: 4 }}>„{s.caption}"</div>
                    <div style={{ fontSize: 9.5, color: "#64748b" }}>ton: {s.tone}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", paddingTop: 10, borderTop: "1px solid rgba(148,163,184,0.12)" }}>
          <div style={{ flex: "1 1 260px", minWidth: 220 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Jak się bronić</div>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>{mp.defenseAdvice}</p>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Podpis rozbraja ryzyko?</div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: mp.canCaptionDisarm ? "#4ade80" : "#f87171" }}>{mp.canCaptionDisarm ? "Tak" : "Nie"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
