"use client";

import { useState } from "react";
import type { CounterfactualVariant, VariantScores } from "@/lib/reaction-simulator/types";
import { riskColor, SectionHeading } from "./primitives";

const SCORE_ROWS: Array<{ key: keyof VariantScores; label: string; invert?: boolean }> = [
  { key: "attackRisk", label: "Ryzyko ataku" },
  { key: "memeRisk", label: "Ryzyko memizacji" },
  { key: "clarity", label: "Zrozumiałość", invert: true },
  { key: "mobilizationPotential", label: "Potencjał mobilizacji", invert: true },
  { key: "mediaPotential", label: "Potencjał medialny", invert: true },
  { key: "goalFit", label: "Zgodność z celem", invert: true },
];

export function CounterfactualVariants(p: { variants: CounterfactualVariant[]; recommended: CounterfactualVariant["type"] | null }) {
  const [copied, setCopied] = useState<string | null>(null);
  if (p.variants.length === 0) return null;

  function copy(text: string, id: string) {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  }

  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="✍️" title="Warianty kontrfaktyczne — powiedz to lepiej" subtitle="5 alternatywnych wersji tego samego komunikatu" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {p.variants.map((v) => {
            const isRecommended = v.type === p.recommended;
            return (
              <div
                key={v.type}
                className={`pdm-variant-card pdm-heat-cell${isRecommended ? " pdm-variant-recommended" : ""}`}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "#e2e8f0" }}>{v.label}</span>
                  {isRecommended && (
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#4ade80", background: "rgba(74,222,128,0.14)", padding: "1px 8px", borderRadius: 10 }}>
                      REKOMENDOWANY
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5, minHeight: 60 }}>{v.text}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {SCORE_ROWS.map((row) => {
                    const val = v.scores[row.key];
                    const shown = row.invert ? 100 - val : val;
                    const color = riskColor(shown);
                    return (
                      <div key={row.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 9.5, color: "#64748b", width: 110, flexShrink: 0 }}>{row.label}</span>
                        <div className="pdm-risk-track" style={{ flex: 1 }}>
                          <div className="pdm-risk-fill" style={{ width: `${val}%`, background: color }} />
                        </div>
                        <span style={{ fontSize: 9.5, color, width: 22, textAlign: "right" }}>{val}</span>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => copy(v.text, v.type)}
                  className="pdm-btn-square"
                  style={{ marginTop: 2, alignSelf: "flex-start", padding: "5px 12px", borderRadius: 7, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: "#7dd3fc", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  {copied === v.type ? "Skopiowano ✓" : "Kopiuj tekst"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
