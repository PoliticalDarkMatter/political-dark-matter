"use client";

import type { ImageOverallScores, ImageReactionSimulationResult, ImageVerdict } from "@/lib/image-reaction-simulator/types";
import { ScoreBadge } from "@/components/reaction-lab/primitives";

export const VERDICT_META: Record<ImageVerdict, { label: string; color: string; bg: string; panelClass: string }> = {
  publikowac: { label: "Publikować", color: "#4ade80", bg: "rgba(74,222,128,0.12)", panelClass: "pdm-panel-safe" },
  publikowac_po_poprawkach: { label: "Publikować po poprawkach", color: "#7dd3fc", bg: "rgba(56,189,248,0.12)", panelClass: "" },
  publikowac_z_oslona: { label: "Publikować tylko z osłoną tekstową", color: "#7dd3fc", bg: "rgba(56,189,248,0.12)", panelClass: "" },
  dobry_kadr_zly_kontekst: { label: "Dobry kadr, zły kontekst", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", panelClass: "" },
  potencjal_ale_memizacja: { label: "Zdjęcie ma potencjał, ale grozi memizacją", color: "#fbbf24", bg: "rgba(251,191,36,0.12)", panelClass: "" },
  lepsze_wewnetrznie: { label: "Lepsze jako materiał wewnętrzny niż publiczny", color: "#fb923c", bg: "rgba(251,146,60,0.12)", panelClass: "" },
  wysokie_ryzyko: { label: "Wysokie ryzyko", color: "#fb923c", bg: "rgba(251,146,60,0.12)", panelClass: "pdm-panel-danger" },
  nie_publikowac: { label: "Nie publikować w tej formie", color: "#f87171", bg: "rgba(248,113,113,0.14)", panelClass: "pdm-panel-danger" },
};

const SCORE_ROWS: Array<{ key: keyof ImageOverallScores; label: string; invert?: boolean }> = [
  { key: "authenticity", label: "Autentyczność", invert: true },
  { key: "empathy", label: "Empatia", invert: true },
  { key: "agency", label: "Sprawczość", invert: true },
  { key: "strengthAuthority", label: "Siła / autorytet", invert: true },
  { key: "closenessToPeople", label: "Bliskość ludzi", invert: true },
  { key: "memeRisk", label: "Ryzyko memizacji" },
  { key: "arroganceRisk", label: "Ryzyko arogancji" },
  { key: "artificialityRisk", label: "Ryzyko sztuczności" },
  { key: "outOfContextRisk", label: "Ryzyko wyrwania z kontekstu" },
  { key: "viralPotential", label: "Potencjał viralowy" },
  { key: "centerCost", label: "Koszt u centrum" },
  { key: "ownBaseGain", label: "Zysk u własnych", invert: true },
  { key: "channelFit", label: "Dopasowanie do kanału", invert: true },
];

export function VerdictCard(p: { result: ImageReactionSimulationResult }) {
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

        <p style={{ fontSize: 15, lineHeight: 1.55, color: "#e2e8f0", margin: "0 0 10px", maxWidth: 780 }}>
          „{result.summary}"
        </p>
        <div style={{ fontSize: 12.5, color: "#7dd3fc", fontWeight: 700, marginBottom: 16, padding: "8px 12px", background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 8, maxWidth: 780 }}>
          → {result.recommendedAction}
        </div>

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
