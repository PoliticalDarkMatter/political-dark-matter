"use client";

import type { VisualRiskFactor } from "@/lib/image-reaction-simulator/types";
import { riskColor, SectionHeading } from "@/components/reaction-lab/primitives";

export function VisualRiskScores(p: { factors: VisualRiskFactor[] }) {
  if (p.factors.length === 0) return null;
  const sorted = [...p.factors].sort((a, b) => b.score - a.score);
  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="⚠️" title="Mapa ryzyk wizualnych" subtitle="15 czynników ryzyka — mimika, gest, tło, crop, sztuczność, arogancja i inne" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "6px 16px" }}>
          {sorted.map((f) => {
            const color = riskColor(f.score);
            return (
              <div key={f.factor} title={f.reason} style={{ display: "flex", flexDirection: "column", gap: 3, padding: "6px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color }}>{f.score}</span>
                </div>
                <div className="pdm-risk-track">
                  <div className="pdm-risk-fill" style={{ width: `${f.score}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
                </div>
                <div style={{ fontSize: 10.5, color: "#64748b", lineHeight: 1.4 }}>{f.reason}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
