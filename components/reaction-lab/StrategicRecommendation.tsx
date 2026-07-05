"use client";

import type { RedFlag, SilenceTest, StrategicRecommendation as StratRec } from "@/lib/reaction-simulator/types";
import { riskColor, SectionHeading } from "./primitives";

const ACTION_LABEL: Record<StratRec["action"], string> = {
  atak: "Uderzyć mocniej", empatia: "Odpowiedzieć empatią", fakty: "Odpowiedzieć faktami",
  ironia: "Odpowiedzieć ironią", przeprosiny: "Przeprosić", milczenie: "Wyciszyć temat", zmiana_tematu: "Zmienić temat",
};

export function StrategicRecommendationCard(p: { rec: StratRec; silence: SilenceTest; redFlags: RedFlag[] }) {
  const { rec, silence, redFlags } = p;
  return (
    <div className="pdm-panel pdm-panel-highlight" style={{ padding: "18px 18px 16px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="🎯" title="Rekomendacja strategiczna" />

        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 8, background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.35)", color: "#7dd3fc", fontSize: 14, fontWeight: 800, marginBottom: 14 }}>
          Zalecane działanie: {ACTION_LABEL[rec.action]}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "10px 22px", marginBottom: 14 }}>
          <div><div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Co zrobić</div><p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>{rec.whatToDo}</p></div>
          <div><div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Czego unikać</div><p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>{rec.whatToAvoid}</p></div>
          <div><div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Zdanie, które musi paść</div><p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>{rec.mustSaySentence}</p></div>
          <div><div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Pierwsza odpowiedź na atak</div><p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>{rec.firstCounterResponse}</p></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10, marginBottom: 16 }}>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: "#fca5a5", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Zdanie, które Cię zabija</div>
            <p style={{ margin: 0, fontSize: 13, color: "#fecaca", fontWeight: 600 }}>„{rec.killerSentence}"</p>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.25)" }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: "#86efac", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Zdanie, które Cię ratuje</div>
            <p style={{ margin: 0, fontSize: 13, color: "#bbf7d0", fontWeight: 600 }}>„{rec.saverSentence}"</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Plan B (backup statement)</div>
            <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{rec.backupStatement}</p>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Co monitorować</div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
              {rec.whatToMonitor.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
        </div>

        {/* Silence test */}
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(15,23,42,0.5)", border: "1px solid rgba(148,163,184,0.15)", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Silence Test — czy lepiej milczeć?</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 6, fontSize: 11.5 }}>
            <span style={{ color: silence.isSilenceSafer ? "#4ade80" : "#94a3b8" }}>Cisza bezpieczniejsza: {silence.isSilenceSafer ? "tak" : "nie"}</span>
            <span style={{ color: silence.wouldResponseAmplify ? "#f87171" : "#94a3b8" }}>Odpowiedź podbije temat: {silence.wouldResponseAmplify ? "tak" : "nie"}</span>
            <span style={{ color: "#7dd3fc" }}>Kanał: {silence.recommendedChannel}</span>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "#cbd5e1", lineHeight: 1.5 }}>{silence.reasoning}</p>
          {silence.whenToReturn && silence.whenToReturn !== "—" && (
            <p style={{ margin: "5px 0 0", fontSize: 11.5, color: "#64748b" }}>Kiedy wrócić z tematem: {silence.whenToReturn}</p>
          )}
        </div>

        {/* Red flags */}
        {redFlags.length > 0 && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Red Flag Scanner — skan min</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {redFlags.map((f, i) => {
                const color = riskColor(f.severity);
                return (
                  <span key={i} title={f.description} style={{ fontSize: 11, fontWeight: 700, color, background: color + "16", border: `1px solid ${color}44`, borderRadius: 20, padding: "3px 10px", cursor: "help" }}>
                    {f.type} · {f.severity}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
