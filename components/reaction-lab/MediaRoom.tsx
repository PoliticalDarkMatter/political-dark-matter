"use client";

import type { MediaCategory, MediaFrame } from "@/lib/reaction-simulator/types";
import { SectionHeading } from "./primitives";

const CATEGORY_LABEL: Record<MediaCategory, string> = {
  przychylne: "Media przychylne",
  wrogie: "Media wrogie",
  neutralne: "Media neutralne",
  tabloidy: "Tabloidy",
  lokalne: "Portale lokalne",
  tv_informacyjne: "Telewizje informacyjne",
  fact_checkerzy: "Fact-checkerzy",
  konta_x: "Konta polityczne na X",
};

const RISK_COLOR: Record<MediaFrame["riskLevel"], string> = {
  niskie: "#4ade80", srednie: "#fbbf24", wysokie: "#f87171",
};

export function MediaRoom(p: { frames: MediaFrame[] }) {
  if (p.frames.length === 0) return null;
  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="📺" title="Media Room — jak to opiszą media?" subtitle="Symulacja per kategoria medium" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
          {p.frames.map((f) => {
            const color = RISK_COLOR[f.riskLevel];
            return (
              <div key={f.category} className="pdm-heat-cell" style={{ borderLeft: `3px solid ${color}88` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    {CATEGORY_LABEL[f.category]}
                  </span>
                  <span style={{ fontSize: 9, fontWeight: 700, color, background: color + "1a", padding: "1px 7px", borderRadius: 10 }}>
                    {f.riskLevel}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.35, marginBottom: 6 }}>„{f.likelyHeadline}"</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}><span style={{ color: "#64748b" }}>cytat: </span>„{f.extractedQuote}"</div>
                <div style={{ fontSize: 10.5, color: "#a78bfa" }}>rama: {f.frame}</div>
                <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 4 }}>czas życia tematu: {f.lifespan}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
