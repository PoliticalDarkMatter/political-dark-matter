"use client";

import { useState } from "react";
import type { ImageObservation, RiskHotspot } from "@/lib/image-reaction-simulator/types";
import { SectionHeading } from "@/components/reaction-lab/primitives";

// ── Podgląd zdjęcia z hotspotami ryzyka ────────────────────────────────
// Współrzędne x/y (% szerokości/wysokości) pochodzą z oceny modelu Vision
// AI na podstawie opisu kompozycji — to przybliżenie, NIE precyzyjny
// bounding box z realnej detekcji obiektów. Architektura (RiskHotspot.x/y
// jako procenty 0-100) jest gotowa na podpięcie realnych współrzędnych,
// gdyby docelowo Vision AI zwracał bounding boxy zamiast szacunku.

export function ImagePreviewHotspots(p: { previewUrl: string; hotspots: RiskHotspot[]; observation: ImageObservation }) {
  const [active, setActive] = useState<number | null>(null);

  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="🎯" title="Podgląd z hotspotami ryzyka" subtitle="Przybliżone pozycje elementów ryzyka i atutów na kadrze — kliknij marker" />
        <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", background: "#05070d", border: "1px solid rgba(148,163,184,0.15)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.previewUrl} alt="Analizowane zdjęcie" style={{ width: "100%", maxHeight: 480, objectFit: "contain", display: "block" }} />
          {p.hotspots.map((h, i) => {
            const color = h.kind === "atut" ? "#4ade80" : "#f87171";
            const isActive = active === i;
            return (
              <div
                key={i}
                onClick={() => setActive(isActive ? null : i)}
                title={h.label}
                style={{
                  position: "absolute", left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%, -50%)",
                  width: 20, height: 20, borderRadius: "50%", cursor: "pointer",
                  background: color + "33", border: `2px solid ${color}`,
                  boxShadow: isActive ? `0 0 0 6px ${color}22` : `0 0 8px ${color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800, color, transition: "box-shadow 0.15s",
                }}
              >
                {h.kind === "atut" ? "+" : "!"}
              </div>
            );
          })}
        </div>
        {active !== null && p.hotspots[active] && (
          <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 8, background: p.hotspots[active].kind === "atut" ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)", border: `1px solid ${p.hotspots[active].kind === "atut" ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: p.hotspots[active].kind === "atut" ? "#86efac" : "#fca5a5", marginBottom: 3 }}>
              {p.hotspots[active].kind === "atut" ? "Atut: " : "Ryzyko: "}{p.hotspots[active].label}
            </div>
            <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>{p.hotspots[active].note}</div>
          </div>
        )}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(148,163,184,0.12)", fontSize: 12, color: "#94a3b8", lineHeight: 1.55 }}>
          {p.observation.rawDescription}
        </div>
      </div>
    </div>
  );
}
