"use client";

import type { EscalationStage } from "@/lib/reaction-simulator/types";
import { riskColor, SectionHeading } from "./primitives";

// Oś czasu + graf eskalacji w jednym komponencie — to ten sam ciąg
// etapów oglądany z dwóch stron (lista chronologiczna + pasek natężenia
// jako uproszczony "propagation graph"). DOCELOWO: kiedy podepniemy
// Influence Graph (patrz orchestrator.ts), whoAmplifies przestanie być
// opisowym tekstem, a stanie się odnośnikiem do węzła w realnym grafie
// aktorów — struktura danych już to obsłuży bez zmian w typach.
export function EscalationTimeline(p: { stages: EscalationStage[] }) {
  if (p.stages.length === 0) return null;
  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="📈" title="Graf eskalacji i oś czasu kryzysu" subtitle="Jak temat może się rozchodzić — etapy, okna czasowe, kto podbija" />

        {/* Pasek natężenia — uproszczony propagation graph */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 54, marginBottom: 16 }}>
          {p.stages.map((s) => {
            const color = riskColor(s.intensity);
            return (
              <div key={s.stage} title={`${s.label}: ${s.intensity}/100`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: "100%", height: Math.max(4, s.intensity * 0.4), background: `linear-gradient(to top, ${color}55, ${color})`, borderRadius: "3px 3px 0 0" }} />
                <span style={{ fontSize: 8, color: "#64748b" }}>{s.stage}</span>
              </div>
            );
          })}
        </div>

        {/* Chronologia szczegółowa */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {p.stages.map((s, i) => (
            <div key={s.stage} style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div className="pdm-timeline-node" style={{ borderColor: riskColor(s.intensity) + "cc" }} />
                {i < p.stages.length - 1 && <div className="pdm-timeline-line" />}
              </div>
              <div style={{ paddingBottom: 16, flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#e2e8f0" }}>{s.label}</span>
                  <span style={{ fontSize: 10, color: "#64748b" }}>{s.window}</span>
                </div>
                <p style={{ margin: "0 0 3px", fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>{s.whatHappens}</p>
                {s.whoAmplifies && s.whoAmplifies !== "—" && (
                  <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 2 }}>podbija: {s.whoAmplifies}</div>
                )}
                {s.counterMeasure && s.counterMeasure !== "—" && (
                  <div style={{ fontSize: 11, color: "#4ade80" }}>przeciwdziałanie: {s.counterMeasure}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
