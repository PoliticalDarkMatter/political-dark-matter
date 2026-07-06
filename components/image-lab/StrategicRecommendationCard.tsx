"use client";

import type {
  AlternativeUseRecommendation, CropRecommendation, ImageStrategicRecommendation, PlatformFitEntry,
} from "@/lib/image-reaction-simulator/types";
import { SectionHeading } from "@/components/reaction-lab/primitives";

function Row(p: { label: string; value: string }) {
  if (!p.value || p.value === "—") return null;
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 2 }}>{p.label}</div>
      <div style={{ fontSize: 12.5, color: "#e2e8f0", lineHeight: 1.5 }}>{p.value}</div>
    </div>
  );
}

function Flag(p: { active: boolean; label: string }) {
  if (!p.active) return null;
  return <span style={{ fontSize: 10.5, fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 8, padding: "3px 9px" }}>{p.label}</span>;
}

const FIT_COLOR: Record<PlatformFitEntry["fit"], string> = { dobre: "#4ade80", wymaga_cropu: "#fbbf24", zle: "#f87171" };
const FIT_LABEL: Record<PlatformFitEntry["fit"], string> = { dobre: "dobre", wymaga_cropu: "wymaga cropu", zle: "słabe" };

export function StrategicRecommendationCard(p: {
  rec: ImageStrategicRecommendation;
  crops: CropRecommendation[];
  altUses: AlternativeUseRecommendation[];
  platformFit: PlatformFitEntry[];
}) {
  const { rec, crops, altUses, platformFit } = p;
  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="🎯" title="Rekomendacja strategiczna" subtitle="Co konkretnie zrobić przed publikacją" />

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <Flag active={rec.needsRetouch} label="wymaga retuszu" />
          <Flag active={rec.needsDifferentImage} label="rozważ inne zdjęcie" />
          <Flag active={rec.needsSeries} label="lepiej seria zdjęć" />
          <Flag active={rec.needsTextualCover} label="wymaga osłony tekstowej" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "4px 24px", marginBottom: 14 }}>
          <Row label="Rekomendowany kanał" value={rec.channel} />
          <Row label="Rekomendowany crop" value={rec.crop} />
          <Row label="Rekomendowany podpis" value={rec.caption} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, paddingTop: 10, borderTop: "1px solid rgba(148,163,184,0.12)", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fca5a5", marginBottom: 3 }}>Największy problem wizualny</div>
            <p style={{ margin: 0, fontSize: 12.5, color: "#e2e8f0", lineHeight: 1.5 }}>{rec.biggestVisualProblem}</p>
          </div>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#86efac", marginBottom: 3 }}>Największy atut wizualny</div>
            <p style={{ margin: 0, fontSize: 12.5, color: "#e2e8f0", lineHeight: 1.5 }}>{rec.biggestVisualAsset}</p>
          </div>
        </div>

        <Row label="Pierwszy kontratak na najgorszą interpretację" value={rec.firstCounterAttack} />

        {crops.length > 0 && (
          <div style={{ marginTop: 10, marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 6 }}>Rekomendacje kadru</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {crops.map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: "#cbd5e1", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                  <span style={{ color: "#7dd3fc", fontWeight: 700 }}>{c.type}: </span>{c.description}
                  <span style={{ color: "#64748b" }}> — {c.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {altUses.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 6 }}>Alternatywne zastosowania</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {altUses.map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: "#cbd5e1", padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                  <span style={{ color: "#a78bfa", fontWeight: 700 }}>{a.useCase}: </span>{a.description}
                </div>
              ))}
            </div>
          </div>
        )}

        {platformFit.length > 0 && (
          <div style={{ paddingTop: 10, borderTop: "1px solid rgba(148,163,184,0.12)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 6 }}>Dopasowanie do kanałów (skan techniczny)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 6 }}>
              {platformFit.map((f) => (
                <div key={f.platform} title={f.note} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "5px 9px", background: "rgba(255,255,255,0.03)", borderRadius: 6 }}>
                  <span style={{ color: "#cbd5e1" }}>{f.platform}</span>
                  <span style={{ color: FIT_COLOR[f.fit], fontWeight: 700 }}>{FIT_LABEL[f.fit]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
