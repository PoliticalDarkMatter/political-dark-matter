"use client";

import type { ImageStageId, ImageStageStatus } from "@/lib/image-reaction-simulator/types";

const STAGE_ORDER: Array<{ id: ImageStageId; label: string }> = [
  { id: "local_scan", label: "Local Image Pre-Scan" },
  { id: "vision_observation", label: "Vision Observation" },
  { id: "visual_risk", label: "Visual Risk Engine" },
  { id: "meme_potential", label: "Meme Potential Engine" },
  { id: "segments", label: "Segment Simulation" },
  { id: "opponents", label: "Opponent Room" },
  { id: "media", label: "Media Room" },
  { id: "caption", label: "Caption Room" },
  { id: "evolution", label: "Evolution Timeline" },
  { id: "final", label: "Final Recommendation" },
];

const STATUS_META: Record<ImageStageStatus, { label: string; dotClass: string; color: string }> = {
  oczekuje: { label: "oczekuje", dotClass: "pdm-stage-dot-wait", color: "#64748b" },
  analizuje: { label: "analizuje…", dotClass: "pdm-stage-dot-run", color: "#38bdf8" },
  gotowe: { label: "gotowe", dotClass: "pdm-stage-dot-done", color: "#4ade80" },
  blad: { label: "błąd", dotClass: "pdm-stage-dot-error", color: "#f87171" },
  fallback: { label: "użyto fallbacku", dotClass: "pdm-stage-dot-fallback", color: "#fbbf24" },
};

export function AIAnalysisProgress(p: { statuses: Partial<Record<ImageStageId, ImageStageStatus>>; running: boolean }) {
  const doneCount = STAGE_ORDER.filter((s) => {
    const st = p.statuses[s.id];
    return st === "gotowe" || st === "fallback";
  }).length;

  return (
    <div className={`pdm-panel${p.running ? " pdm-scan-sweep" : ""}`} style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, position: "relative", zIndex: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>Analiza AI</span>
        <span style={{ fontSize: 11, color: "#64748b" }}>{doneCount}/{STAGE_ORDER.length} etapów</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", position: "relative", zIndex: 1 }}>
        {STAGE_ORDER.map((s) => {
          const status = p.statuses[s.id] ?? "oczekuje";
          const meta = STATUS_META[status];
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 150 }}>
              <span className={`pdm-stage-dot ${meta.dotClass}`} />
              <span style={{ fontSize: 12, color: "#cbd5e1" }}>{s.label}</span>
              <span style={{ fontSize: 10, color: meta.color, fontWeight: 700 }}>{meta.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
