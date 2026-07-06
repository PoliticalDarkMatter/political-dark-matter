"use client";

import type { ImageEvolutionStage } from "@/lib/image-reaction-simulator/types";
import { riskColor, SectionHeading } from "@/components/reaction-lab/primitives";

export function EvolutionTimeline(p: { stages: ImageEvolutionStage[] }) {
  if (p.stages.length === 0) return null;
  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="📈" title="Image Evolution Timeline" subtitle="Jak może ewoluować odbiór zdjęcia w pierwszych 48+ godzinach" />

        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 54, marginBottom: 16 }}>
          {p.stages.map((s, i) => {
            const color = riskColor(s.intensity);
            return (
              <div key={i} title={`${s.label}: ${s.intensity}/100`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: "100%", height: Math.max(4, s.intensity * 0.4), background: `linear-gradient(to top, ${color}55, ${color})`, borderRadius: "3px 3px 0 0" }} />
                <span style={{ fontSize: 8, color: "#64748b" }}>{i + 1}</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {p.stages.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div className="pdm-timeline-node" style={{ borderColor: riskColor(s.intensity) + "cc" }} />
                {i < p.stages.length - 1 && <div className="pdm-timeline-line" />}
              </div>
              <div style={{ paddingBottom: 16, flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 3, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#e2e8f0" }}>{s.label}</span>
                  <span style={{ fontSize: 10, color: "#64748b" }}>{s.window}</span>
                </div>
                <p style={{ margin: "0 0 3px", fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>{s.whatMayHappen}</p>
                {s.whoAmplifies && s.whoAmplifies !== "—" && (
                  <div style={{ fontSize: 11, color: "#a78bfa", marginBottom: 2 }}>podbija: {s.whoAmplifies}</div>
                )}
                {s.likelyComment && s.likelyComment !== "—" && (
                  <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginBottom: 2 }}>„{s.likelyComment}"</div>
                )}
                {s.howToReact && s.howToReact !== "—" && (
                  <div style={{ fontSize: 11, color: "#4ade80" }}>reakcja: {s.howToReact}</div>
                )}
                {s.whatNotToDo && s.whatNotToDo !== "—" && (
                  <div style={{ fontSize: 11, color: "#f87171" }}>unikać: {s.whatNotToDo}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
