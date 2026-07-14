"use client";

import type { ApexStageId, ApexStageStatus } from "@/lib/apex-grid/types";

// ── Postęp pipeline'u — Apex Grid ──────────────────────────────────────
// Pięć stałych warstw, dokładnie jak w dokumencie koncepcyjnym (Sygnał →
// Grunt → Narada → Scenariusze → Decyzja) — UI pokazuje ten sam model
// myślowy, który zna klient. Postęp narady (ekspert po ekspercie) leci w
// event.data {done,total} i jest doklejany do etykiety warstwy trzeciej.

const STAGE_ORDER: Array<{ id: ApexStageId; num: string; label: string }> = [
  { id: "signal", num: "1", label: "Sygnał · Narrative Scope" },
  { id: "ground", num: "2", label: "Grunt · e-Wyborcy" },
  { id: "council", num: "3", label: "Narada · e-Konsylium" },
  { id: "scenarios", num: "4", label: "Scenariusze" },
  { id: "decision", num: "5", label: "Decyzja" },
];

const STATUS_META: Record<ApexStageStatus, { label: string; dotClass: string; color: string }> = {
  oczekuje: { label: "oczekuje", dotClass: "pdm-stage-dot-wait", color: "#64748b" },
  analizuje: { label: "analizuje…", dotClass: "pdm-stage-dot-run", color: "#818cf8" },
  gotowe: { label: "gotowe", dotClass: "pdm-stage-dot-done", color: "#4ade80" },
  blad: { label: "błąd", dotClass: "pdm-stage-dot-error", color: "#f87171" },
  fallback: { label: "częściowy fallback", dotClass: "pdm-stage-dot-fallback", color: "#fbbf24" },
};

export function PipelineProgress(p: {
  statuses: Partial<Record<ApexStageId, ApexStageStatus>>;
  councilProgress: { done: number; total: number } | null;
  running: boolean;
}) {
  const doneCount = STAGE_ORDER.filter((s) => {
    const st = p.statuses[s.id];
    return st === "gotowe" || st === "fallback";
  }).length;

  return (
    <div className={`pdm-panel${p.running ? " pdm-scan-sweep" : ""}`} style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, position: "relative", zIndex: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94a3b8" }}>
          Pipeline pięciu warstw
        </span>
        <span style={{ fontSize: 11, color: "#64748b" }}>{doneCount}/{STAGE_ORDER.length} warstw</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px", position: "relative", zIndex: 1 }}>
        {STAGE_ORDER.map((s) => {
          const status = p.statuses[s.id] ?? "oczekuje";
          const meta = STATUS_META[status];
          const councilSuffix =
            s.id === "council" && p.councilProgress && p.councilProgress.total > 0 && status === "analizuje"
              ? ` ${p.councilProgress.done}/${p.councilProgress.total} głosów`
              : "";
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 190 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: "#475569", width: 12 }}>{s.num}</span>
              <span className={`pdm-stage-dot ${meta.dotClass}`} />
              <span style={{ fontSize: 12, color: "#cbd5e1" }}>{s.label}</span>
              <span style={{ fontSize: 10, color: meta.color, fontWeight: 700 }}>
                {meta.label}{councilSuffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
