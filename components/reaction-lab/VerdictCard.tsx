"use client";

import type { OverallScores, ReactionSimulationResult, Verdict } from "@/lib/reaction-simulator/types";
import { ScoreBadge } from "./primitives";

export const VERDICT_META: Record<Verdict, { label: string; color: string; bg: string; panelClass: string }> = {
  publikowac: { label: "Publikować", color: "#4ade80", bg: "rgba(74,222,128,0.12)", panelClass: "pdm-panel-safe" },
  publikowac_po_poprawkach: { label: "Publikować po poprawkach", color: "#7dd3fc", bg: "rgba(56,189,248,0.12)", panelClass: "" },
  potencjal_ofensywny_wymaga_oslony: { label: "Potencjał ofensywny — wymaga osłony", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", panelClass: "" },
  wysokie_ryzyko: { label: "Wysokie ryzyko", color: "#fb923c", bg: "rgba(251,146,60,0.12)", panelClass: "pdm-panel-danger" },
  nie_publikowac: { label: "Nie publikować w tej formie", color: "#f87171", bg: "rgba(248,113,113,0.14)", panelClass: "pdm-panel-danger" },
};

const SCORE_ROWS: Array<{ key: keyof OverallScores; label: string; invert?: boolean }> = [
  { key: "crisisRisk", label: "Ryzyko kryzysu" },
  { key: "outOfContextVulnerability", label: "Podatność na wyrwanie z kontekstu" },
  { key: "memeRisk", label: "Ryzyko memizacji" },
  { key: "centerCost", label: "Koszt u centrum" },
  { key: "mobilizationPotential", label: "Potencjał mobilizacji", invert: true },
  { key: "ownBaseGain", label: "Zysk u własnych", invert: true },
  { key: "mediaPotential", label: "Potencjał medialny" },
  { key: "clarity", label: "Zrozumiałość", invert: true },
];

export function VerdictCard(p: { result: ReactionSimulationResult }) {
  const { result } = p;
  const meta = VERDICT_META[result.verdict];
  const fellBack = result.usedFallback.length > 0;

  return (
    <div className={`pdm-panel ${meta.panelClass}`} style={{ padding: "22px 24px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", marginBottom: 6 }}>Werdykt</div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 16px", borderRadius: 10,
              background: meta.bg, border: `1px solid ${meta.color}55`, color: meta.color, fontSize: 18, fontWeight: 900,
            }}>
              {meta.label}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Pewność analizy</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: result.uncertaintyLevel === "wysoka" ? "#fbbf24" : result.uncertaintyLevel === "srednia" ? "#7dd3fc" : "#4ade80" }}>
              {result.uncertaintyLevel === "wysoka" ? "Niska" : result.uncertaintyLevel === "srednia" ? "Średnia" : "Wysoka"}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.55, color: "#e2e8f0", margin: "0 0 16px", maxWidth: 780 }}>
          „{result.summary}"
        </p>

        {result.input.inputMode === "wydarzenie_zaistniale" && (
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: -10, marginBottom: 14 }}>
            To już zaistniało — etykieta werdyktu odnosi się do dalszego reagowania, nie do pierwszej publikacji.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px 22px", marginBottom: 16 }}>
          {SCORE_ROWS.map((row) => (
            <ScoreBadge key={row.key} label={row.label} value={result.overallScores[row.key]} invert={row.invert} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", paddingTop: 14, borderTop: "1px solid rgba(148,163,184,0.12)" }}>
          <div style={{ flex: "1 1 260px", minWidth: 220 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Na czym oparto tę ocenę</div>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, lineHeight: 1.5 }}>{result.aiConfidenceNotes}</p>
          </div>
          <div style={{ flex: "1 1 260px", minWidth: 220 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 4 }}>Ograniczenia danych</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
              {result.dataLimitations.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          </div>
        </div>

        {fellBack && (
          <div style={{ marginTop: 14, fontSize: 11, color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 8, padding: "7px 11px" }}>
            ⚠ Użyto fallbacku lokalnego dla etapów: {result.usedFallback.join(", ")} — te sekcje raportu są uproszczone.
          </div>
        )}
      </div>
    </div>
  );
}
