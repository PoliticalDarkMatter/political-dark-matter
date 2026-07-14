"use client";

import type { ConsiliumResult } from "@/lib/consilium/types";
import { ExpertOpinions } from "./ExpertOpinions";
import { BulletList, CopyButton, EmptyNote, Panel, PriorityBadge, SectionHeading } from "./primitives";

const RISK_MAP_LABELS: Record<keyof ConsiliumResult["synthesis"]["riskMap"], string> = {
  political: "Polityczne",
  legal: "Prawne",
  media: "Medialne",
  social: "Społeczne",
  economic: "Ekonomiczne",
  internet: "Internet / social media",
  reputational: "Wizerunkowe",
};

// ── Widok wyniku e-Konsylium — ŚCISŁA HIERARCHIA (wymóg specyfikacji) ────
// Polityk czytający ten widok ma w kilka sekund wiedzieć, co robić — więc
// finalna rekomendacja jest PIERWSZA, a dziesięć opinii ekspertów, mimo że
// to one "wykonały pracę", są na samym końcu, jako materiał źródłowy do
// wglądu, nie jako pierwsza rzecz na ekranie. Kolejność jest identyczna
// jak w specyfikacji: rekomendacja → diagnoza → konsensus → spór →
// mapa ryzyka → mapa szans → gotowe zdania / czego nie mówić →
// eksperci → checklist weryfikacji.
export function ResultsView(p: { result: ConsiliumResult }) {
  const { synthesis, researchContext, expertOpinions, usedFallback, synthesisUsedFallback, modelInfo } = p.result;
  const riskEntries = (Object.keys(RISK_MAP_LABELS) as Array<keyof typeof RISK_MAP_LABELS>)
    .map((k) => ({ key: k, label: RISK_MAP_LABELS[k], items: synthesis.riskMap[k] }))
    .filter((r) => r.items.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Pasek meta — przejrzystość co do jakości danych, nie część hierarchii decyzyjnej */}
      <div style={{ fontSize: 11, color: "#64748b", display: "flex", flexWrap: "wrap", gap: "4px 14px", padding: "0 2px" }}>
        <span>Model: {modelInfo.isReal ? modelInfo.provider : "fallback lokalny (brak klucza AI)"}</span>
        <span>Research: {researchContext.hasRealData ? `${researchContext.totalFound} materiałów dla fraz „${researchContext.query}"` : "brak realnych materiałów w przeszukanym oknie"}</span>
        {(usedFallback.length > 0 || synthesisUsedFallback) && (
          <span style={{ color: "#fbbf24" }}>
            Fallback lokalny: {usedFallback.length}/10 ekspertów{synthesisUsedFallback ? " + synteza" : ""}
          </span>
        )}
      </div>

      {/* 1. Finalna rekomendacja — pierwsza rzecz na ekranie */}
      <div
        className="pdm-panel"
        style={{
          padding: "20px 20px 18px",
          background: "linear-gradient(135deg, rgba(56,189,248,0.08), rgba(124,58,237,0.06))",
          border: "1px solid rgba(56,189,248,0.3)",
        }}
      >
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7dd3fc" }}>
              Rekomendacja e-Konsylium — {synthesis.caseTitle}
            </div>
            <PriorityBadge priority={synthesis.finalRecommendation.priority} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc", lineHeight: 1.4, marginBottom: 10 }}>
            {synthesis.finalRecommendation.decision}
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6 }}>{synthesis.finalRecommendation.rationale}</div>
        </div>
      </div>

      {/* 2. Istota sprawy */}
      <Panel>
        <SectionHeading icon="🎯" title="Istota sprawy" />
        <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.65, marginBottom: synthesis.keyFindings.length > 0 ? 12 : 0 }}>
          {synthesis.coreDiagnosis || <EmptyNote>Brak diagnozy.</EmptyNote>}
        </div>
        {synthesis.keyFindings.length > 0 && (
          <>
            <div style={fieldLabel}>Najważniejsze wnioski</div>
            <BulletList items={synthesis.keyFindings} />
          </>
        )}
      </Panel>

      {/* 3. Protokół konsensusu */}
      {synthesis.consensusProtocol.length > 0 && (
        <Panel>
          <SectionHeading icon="🤝" title="Gdzie eksperci się zgadzają" />
          <BulletList items={synthesis.consensusProtocol} color="#86efac" />
        </Panel>
      )}

      {/* 4. Protokół sporu */}
      {synthesis.disagreementProtocol.length > 0 && (
        <Panel>
          <SectionHeading icon="⚖️" title="Gdzie jest napięcie — i jak je rozstrzygnięto" />
          <BulletList items={synthesis.disagreementProtocol} color="#fbbf24" />
        </Panel>
      )}

      {/* 5. Mapa ryzyka */}
      <Panel>
        <SectionHeading icon="🛡️" title="Mapa ryzyka" subtitle="Wyłącznie kategorie, w których zidentyfikowano realne ryzyko" />
        {riskEntries.length === 0 ? (
          <EmptyNote>e-Konsylium nie zidentyfikowało istotnych ryzyk w żadnej kategorii.</EmptyNote>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {riskEntries.map((r) => (
              <div key={r.key}>
                <div style={fieldLabel}>{r.label}</div>
                <BulletList items={r.items} color="#fca5a5" />
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* 6. Mapa szans */}
      {synthesis.opportunityMap.length > 0 && (
        <Panel>
          <SectionHeading icon="✨" title="Mapa szans" />
          <BulletList items={synthesis.opportunityMap} color="#86efac" />
        </Panel>
      )}

      {/* 7. Gotowe komunikaty + czego nie mówić */}
      {(synthesis.messageLines.length > 0 || synthesis.thingsNotToSay.length > 0) && (
        <Panel>
          <SectionHeading icon="💬" title="Gotowe do użycia" subtitle="Linie komunikacyjne zgodne z rekomendacją" />
          <div style={{ display: "grid", gridTemplateColumns: synthesis.thingsNotToSay.length > 0 ? "1fr 1fr" : "1fr", gap: 18 }}>
            {synthesis.messageLines.length > 0 && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={fieldLabel}>Zdania do wypowiedzenia</div>
                  <CopyButton text={synthesis.messageLines.join("\n")} label="kopiuj wszystkie" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {synthesis.messageLines.map((line, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.16)" }}>
                      <span style={{ fontSize: 12.5, color: "#e0f2fe" }}>„{line}"</span>
                      <CopyButton text={line} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {synthesis.thingsNotToSay.length > 0 && (
              <div>
                <div style={fieldLabel}>Czego nie mówić</div>
                <BulletList items={synthesis.thingsNotToSay} color="#fca5a5" />
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* 8. Dziesięć głosów ekspertów — materiał źródłowy, nie pierwszy plan */}
      <ExpertOpinions opinions={expertOpinions} usedFallback={usedFallback} />

      {/* 9. Checklist weryfikacji */}
      {synthesis.verificationChecklist.length > 0 && (
        <Panel>
          <SectionHeading icon="✅" title="Zanim to wykorzystasz publicznie" subtitle="Co jeszcze sprawdzić lub potwierdzić" />
          <BulletList items={synthesis.verificationChecklist} />
        </Panel>
      )}
    </div>
  );
}

const fieldLabel = {
  fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.04em", marginBottom: 6,
};
