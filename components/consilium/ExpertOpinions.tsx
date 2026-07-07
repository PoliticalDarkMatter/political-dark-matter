"use client";

import { useState, type CSSProperties } from "react";
import type { ExpertOpinion } from "@/lib/consilium/types";
import { BulletList, ConfidenceBadge, EmptyNote, Panel, SectionHeading } from "./primitives";

// Zgodnie z hierarchią wyniku (patrz ResultsView.tsx): dziesięć opinii
// ekspertów jest na SAMYM KOŃCU, jako materiał źródłowy do wglądu, nie
// jako pierwsza rzecz, którą widzi użytkownik. Zakładki, nie ściana
// dziesięciu esejów naraz — polityk ma czytać decyzję w syntezie, a tu
// tylko sprawdzać, skąd się wzięła, jeśli chce.
export function ExpertOpinions(p: { opinions: ExpertOpinion[]; usedFallback: string[] }) {
  const [active, setActive] = useState(0);
  if (p.opinions.length === 0) return null;
  const current = p.opinions[active];

  return (
    <Panel>
      <SectionHeading icon="🧭" title="Głosy ekspertów Konsylium" subtitle="Materiał źródłowy pod syntezą — dziesięć niezależnych perspektyw" />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {p.opinions.map((o, i) => {
          const isActive = i === active;
          const isFallback = p.usedFallback.includes(o.expertId);
          return (
            <button
              key={o.expertId}
              type="button"
              onClick={() => setActive(i)}
              className={"pdm-pill" + (isActive ? " pdm-pill-active" : "")}
              style={{
                padding: "6px 12px",
                border: isActive ? "1px solid rgba(56,189,248,0.55)" : "1px solid rgba(148,163,184,0.18)",
                background: isActive ? "linear-gradient(135deg, rgba(56,189,248,0.24), rgba(124,58,237,0.20))" : "rgba(15,23,42,0.5)",
                color: isActive ? "#bae6fd" : "#94a3b8",
                fontSize: 11, fontWeight: 700, position: "relative",
              }}
              title={isFallback ? "Ten ekspert użył lokalnego fallbacku (brak realnej odpowiedzi AI)" : undefined}
            >
              {o.expertName}
              {isFallback && <span style={{ marginLeft: 5, color: "#fbbf24" }}>⚠</span>}
            </button>
          );
        })}
      </div>

      <div style={{ background: "rgba(8,11,20,0.4)", border: "1px solid rgba(148,163,184,0.12)", borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#f1f5f9" }}>{current.headline}</div>
          <ConfidenceBadge confidence={current.confidence} />
        </div>
        <div style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 14 }}>{current.diagnosis}</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <div>
            <div style={fieldLabelStyle}>Kluczowe ustalenia</div>
            {current.keyFindings.length > 0 ? <BulletList items={current.keyFindings} /> : <EmptyNote>brak</EmptyNote>}
          </div>
          <div>
            <div style={fieldLabelStyle}>Ryzyka</div>
            {current.risks.length > 0 ? <BulletList items={current.risks} color="#fca5a5" /> : <EmptyNote>brak</EmptyNote>}
          </div>
          <div>
            <div style={fieldLabelStyle}>Szanse</div>
            {current.opportunities.length > 0 ? <BulletList items={current.opportunities} color="#86efac" /> : <EmptyNote>nie zidentyfikowano</EmptyNote>}
          </div>
          <div>
            <div style={fieldLabelStyle}>Rekomendacje</div>
            {current.recommendations.length > 0 ? <BulletList items={current.recommendations} /> : <EmptyNote>brak</EmptyNote>}
          </div>
        </div>

        {current.strongestLine && (
          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 9, background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)" }}>
            <div style={fieldLabelStyle}>Najmocniejsze zdanie</div>
            <div style={{ fontSize: 12.5, color: "#e0f2fe", fontStyle: "italic" }}>„{current.strongestLine}"</div>
          </div>
        )}

        {current.thingsNotToSay.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={fieldLabelStyle}>Czego nie mówić</div>
            <BulletList items={current.thingsNotToSay} color="#fca5a5" />
          </div>
        )}

        {current.openQuestions.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={fieldLabelStyle}>Otwarte pytania</div>
            <BulletList items={current.openQuestions} color="#94a3b8" />
          </div>
        )}

        {(current.researchNotes.usedSources.length > 0 || current.researchNotes.missingSources.length > 0 || current.researchNotes.verificationNeeded.length > 0) && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(148,163,184,0.12)" }}>
            <div style={fieldLabelStyle}>Notatki researchowe</div>
            {current.researchNotes.usedSources.length > 0 && (
              <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 4 }}>Wykorzystano: {current.researchNotes.usedSources.join("; ")}</div>
            )}
            {current.researchNotes.missingSources.length > 0 && (
              <div style={{ fontSize: 11.5, color: "#94a3b8", marginBottom: 4 }}>Brakuje: {current.researchNotes.missingSources.join("; ")}</div>
            )}
            {current.researchNotes.verificationNeeded.length > 0 && (
              <div style={{ fontSize: 11.5, color: "#fbbf24" }}>Do zweryfikowania: {current.researchNotes.verificationNeeded.join("; ")}</div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}

const fieldLabelStyle: CSSProperties = {
  fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6,
};
