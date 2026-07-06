"use client";

import type { OpponentImageAttack } from "@/lib/image-reaction-simulator/types";
import { OPPONENT_VECTOR_LABELS } from "@/lib/image-reaction-simulator/mock-data";
import { riskColor, SectionHeading } from "@/components/reaction-lab/primitives";

export function OpponentImageRoom(p: { attacks: OpponentImageAttack[] }) {
  if (p.attacks.length === 0) return null;
  const sorted = [...p.attacks].sort((a, b) => b.severity - a.severity);
  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="⚔️" title="Opponent Room — jak zaatakują to zdjęcie" subtitle="Symulacja 11 wektorów ataku, posortowana wg dotkliwości" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map((a) => {
            const color = riskColor(a.severity);
            return (
              <div key={a.vector} style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", borderLeft: `3px solid ${color}88` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.03em" }}>{OPPONENT_VECTOR_LABELS[a.vector]}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color }}>{a.severity}/100</span>
                </div>
                <div style={{ fontSize: 10.5, color: "#64748b", marginBottom: 4 }}>{a.from}</div>
                <div style={{ fontSize: 12.5, color: "#e2e8f0", lineHeight: 1.45 }}>{a.attack}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
