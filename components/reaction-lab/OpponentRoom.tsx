"use client";

import type { AttackVector, OpponentAttack } from "@/lib/reaction-simulator/types";
import { riskColor, SectionHeading } from "./primitives";

const VECTOR_LABEL: Record<AttackVector, string> = {
  lewica: "Atak z lewej", prawica: "Atak z prawej", liberalny: "Atak liberalny",
  populistyczny: "Atak populistyczny", ekspercki: "Atak ekspercki",
  personalny: "Atak personalny", memiczny: "Atak memiczny",
};

export function OpponentRoom(p: { attacks: OpponentAttack[] }) {
  if (p.attacks.length === 0) return null;
  const sorted = [...p.attacks].sort((a, b) => b.severity - a.severity);
  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="⚔️" title="Opponent Room — jak zaatakuje przeciwnik?" subtitle="Siedem kierunków ataku, posortowane wg dotkliwości" />
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {sorted.map((a) => {
            const color = riskColor(a.severity);
            return (
              <div key={a.vector} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "9px 11px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)", borderLeft: `3px solid ${color}99` }}>
                <div style={{ minWidth: 118, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#e2e8f0" }}>{VECTOR_LABEL[a.vector]}</div>
                  <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 1 }}>{a.from}</div>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5, flex: 1 }}>{a.attack}</p>
                <span style={{ fontSize: 10, fontWeight: 800, color, whiteSpace: "nowrap" }}>{a.severity}/100</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
