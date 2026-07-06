"use client";

import { useState } from "react";
import type { SegmentImageReaction } from "@/lib/image-reaction-simulator/types";
import { riskColor, SectionHeading } from "@/components/reaction-lab/primitives";

const STRENGTH_COLOR: Record<SegmentImageReaction["strengthensOrWeakens"], string> = {
  wzmacnia: "#4ade80", oslabia: "#f87171", neutralne: "#94a3b8",
};
const STRENGTH_LABEL: Record<SegmentImageReaction["strengthensOrWeakens"], string> = {
  wzmacnia: "wzmacnia przekaz", oslabia: "osłabia przekaz", neutralne: "neutralne",
};

export function SegmentImageHeatmap(p: { segments: SegmentImageReaction[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (p.segments.length === 0) return null;

  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="🌡️" title="Heatmapa reakcji segmentów na zdjęcie" subtitle="Kliknij segment, żeby zobaczyć szczegóły" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
          {p.segments.map((s) => {
            const color = riskColor(s.risk);
            const isOpen = open === s.segment;
            return (
              <div
                key={s.segment}
                className="pdm-heat-cell"
                onClick={() => setOpen(isOpen ? null : s.segment)}
                style={{ cursor: "pointer", borderColor: isOpen ? color + "88" : undefined }}
              >
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#e2e8f0", marginBottom: 4, lineHeight: 1.25 }}>{s.segment}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>{s.emotion}</div>
                <div className="pdm-risk-track" style={{ marginBottom: 4 }}>
                  <div className="pdm-risk-fill" style={{ width: `${s.risk}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#64748b" }}>
                  <span>ryzyko {s.risk}</span>
                  <span>akceptacja {s.acceptance}</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 9, fontWeight: 700, color: STRENGTH_COLOR[s.strengthensOrWeakens] }}>{STRENGTH_LABEL[s.strengthensOrWeakens]}</div>
                {isOpen && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(148,163,184,0.15)", fontSize: 11, color: "#cbd5e1", lineHeight: 1.45 }}>
                    <div style={{ marginBottom: 4 }}>{s.interpretation}</div>
                    <div style={{ fontStyle: "italic", color: "#94a3b8", marginBottom: 4 }}>„{s.likelyComment}"</div>
                    <div style={{ fontSize: 10, color: "#7dd3fc" }}>poprawa: {s.improvementTip}</div>
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
