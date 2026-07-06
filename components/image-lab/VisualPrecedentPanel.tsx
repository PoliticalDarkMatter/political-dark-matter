"use client";

import type { VisualPrecedentMatch } from "@/lib/image-reaction-simulator/types";
import { EmptyNote, RiskPill, SectionHeading } from "@/components/reaction-lab/primitives";

// ── Silnik precedensów wizualnych — UI ────────────────────────────────
// WAŻNE: to NIE jest lista "udokumentowanych afer" — to dopasowanie do
// ogólnych, powtarzalnych wzorców wizualnych (patrz
// lib/image-reaction-simulator/visual-precedents.ts). Dlatego każda
// pozycja MUSI pokazywać jawne zastrzeżenie (historicalNote) — nigdy nie
// prezentujemy tego jak zweryfikowanego, nazwanego przypadku historycznego.

export function VisualPrecedentPanel(p: { precedents: VisualPrecedentMatch[] }) {
  const list = [...p.precedents].sort((a, b) => b.matchStrength - a.matchStrength);

  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading
          icon="🗂️"
          title="Visual Precedent Engine"
          subtitle="Dopasowanie do ogólnych, powtarzalnych wzorców wizualnych kryzysów — nie baza konkretnych afer"
        />

        {list.length === 0 ? (
          <EmptyNote>To zdjęcie nie pasuje wyraźnie do żadnego ze znanych, powtarzalnych wzorców wizualnych w bibliotece analizy.</EmptyNote>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((m, i) => (
              <div key={i} className="pdm-heat-cell" style={{ borderLeft: "3px solid rgba(167,139,250,0.55)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#e2e8f0" }}>{m.label}</span>
                  <RiskPill value={m.matchStrength} label={`dopasowanie ${m.matchStrength}/100`} />
                </div>

                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 3 }}>Dlaczego to zdjęcie pasuje</div>
                  <p style={{ margin: 0, fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.5 }}>{m.whySimilar}</p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 3 }}>Typowy wzorzec</div>
                    <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{m.typicalPattern}</p>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b", marginBottom: 3 }}>Zwykły przebieg</div>
                    <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{m.typicalOutcome}</p>
                  </div>
                </div>

                <div style={{
                  fontSize: 11, color: "#fbbf24", background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.25)", borderRadius: 6, padding: "6px 10px",
                }}>
                  ⚠ {m.historicalNote}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(148,163,184,0.12)", fontSize: 10.5, color: "#64748b", lineHeight: 1.5 }}>
          To biblioteka OGÓLNYCH wzorców wizualnych, wielokrotnie obserwowanych w polityce niezależnie od kraju czy partii — nie zweryfikowana baza konkretnych, nazwanych zdarzeń historycznych. Traktuj jako punkt odniesienia do ryzyka, nie jako dowód.
        </div>
      </div>
    </div>
  );
}
