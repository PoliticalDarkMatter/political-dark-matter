"use client";

import type { MediaCategory, MediaImageFrame } from "@/lib/image-reaction-simulator/types";
import { SectionHeading } from "@/components/reaction-lab/primitives";

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

const RISK_COLOR: Record<MediaImageFrame["negativeUseRisk"], string> = { niskie: "#4ade80", srednie: "#fbbf24", wysokie: "#f87171" };

export function MediaImageRoom(p: { frames: MediaImageFrame[] }) {
  if (p.frames.length === 0) return null;
  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="📺" title="Media Room — jak wykorzystają to zdjęcie" subtitle="Symulacja per kategoria medium: podpis, tytuł, pasek, lead, komentarz" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 10 }}>
          {p.frames.map((f) => {
            const color = RISK_COLOR[f.negativeUseRisk];
            return (
              <div key={f.category} className="pdm-heat-cell" style={{ borderLeft: `3px solid ${color}88` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.03em" }}>{CATEGORY_LABEL[f.category]}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color, background: color + "1a", padding: "1px 7px", borderRadius: 10 }}>{f.negativeUseRisk}</span>
                </div>
                <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, lineHeight: 1.35, marginBottom: 5 }}>„{f.portalHeadline}"</div>
                <div style={{ fontSize: 10.5, color: "#94a3b8", marginBottom: 3 }}><span style={{ color: "#64748b" }}>podpis: </span>„{f.agencyCaption}"</div>
                <div style={{ fontSize: 10.5, color: "#94a3b8", marginBottom: 3 }}><span style={{ color: "#64748b" }}>pasek TV: </span>{f.tvChyron}</div>
                <div style={{ fontSize: 10.5, color: "#a78bfa", marginBottom: 3 }}>{f.columnistComment}</div>
                {f.illustratesBiggerNarrative && (
                  <div style={{ fontSize: 9.5, color: "#fbbf24", marginTop: 4 }}>⚠ może stać się ilustracją większej narracji</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
