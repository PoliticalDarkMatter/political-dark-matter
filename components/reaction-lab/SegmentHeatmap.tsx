"use client";

import { useState } from "react";
import type { SegmentReaction } from "@/lib/reaction-simulator/types";
import { riskColor, SectionHeading } from "./primitives";

export function SegmentHeatmap(p: { segments: SegmentReaction[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (p.segments.length === 0) return null;

  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="🌡️" title="Heatmapa reakcji segmentów" subtitle="Kliknij segment, żeby zobaczyć szczegóły" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
          {p.segments.map((s) => {
            const color = riskColor(s.outrage);
            const isOpen = open === s.segment;
            return (
              <div
                key={s.segment}
                className="pdm-heat-cell"
                onClick={() => setOpen(isOpen ? null : s.segment)}
                style={{ cursor: "pointer", borderColor: isOpen ? color + "88" : undefined }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#e2e8f0", marginBottom: 6, lineHeight: 1.25 }}>{s.segment}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>{s.emotion}</div>
                <div className="pdm-risk-track" style={{ marginBottom: 4 }}>
                  <div className="pdm-risk-fill" style={{ width: `${s.outrage}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#64748b" }}>
                  <span>oburzenie {s.outrage}</span>
                  <span>akceptacja {s.acceptance}</span>
                </div>
                {isOpen && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(148,163,184,0.15)", fontSize: 11, color: "#cbd5e1", lineHeight: 1.45 }}>
                    <div style={{ marginBottom: 4 }}><span style={{ color: "#7dd3fc", fontWeight: 600 }}>Argument: </span>{s.mainArgument}</div>
                    <div style={{ fontStyle: "italic", color: "#94a3b8" }}>„{s.sampleComment}"</div>
                    <div style={{ marginTop: 4, fontSize: 9, color: "#64748b" }}>niepewność: {s.uncertainty} · zaangażowanie: {s.engagementLikelihood}/100</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
