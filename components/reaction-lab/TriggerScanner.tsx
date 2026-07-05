"use client";

import type { TriggerPhraseAnalysis } from "@/lib/reaction-simulator/types";
import { riskColor, SectionHeading, EmptyNote } from "./primitives";

const ACTION_LABEL: Record<TriggerPhraseAnalysis["action"], { label: string; color: string }> = {
  "usunąć": { label: "Usunąć", color: "#f87171" },
  "osłabić": { label: "Osłabić", color: "#fb923c" },
  "przeramować": { label: "Przeramować", color: "#fbbf24" },
  "zostawić": { label: "Zostawić", color: "#4ade80" },
};

export function TriggerScanner(p: { text: string; phrases: TriggerPhraseAnalysis[] }) {
  // Podświetlenie oryginalnego tekstu w miejscach wykrytych fraz —
  // wizualny "efekt skanowania" z sekcji 11 specyfikacji.
  let highlighted: React.ReactNode = p.text;
  if (p.phrases.length > 0) {
    const parts: React.ReactNode[] = [];
    let rest = p.text;
    let key = 0;
    for (const t of p.phrases) {
      const idx = rest.toLowerCase().indexOf(t.phrase.toLowerCase());
      if (idx === -1) continue;
      parts.push(rest.slice(0, idx));
      parts.push(
        <mark key={key++} style={{ background: "rgba(248,113,113,0.25)", color: "#fecaca", borderRadius: 3, padding: "0 3px" }}>
          {rest.slice(idx, idx + t.phrase.length)}
        </mark>
      );
      rest = rest.slice(idx + t.phrase.length);
    }
    parts.push(rest);
    highlighted = parts;
  }

  return (
    <div className="pdm-panel" style={{ padding: "16px 16px 14px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="🔬" title="Skan fraz zapalnych" subtitle="Co dokładnie w tekście jest ryzykowne" />
        <div style={{ background: "rgba(8,11,20,0.5)", border: "1px solid rgba(148,163,184,0.15)", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, marginBottom: 14 }}>
          {highlighted}
        </div>
        {p.phrases.length === 0 ? (
          <EmptyNote>Nie wykryto fraz ze słownika ryzyka — nie oznacza to braku ryzyka, oceń treść merytorycznie.</EmptyNote>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {p.phrases.map((t, i) => {
              const action = ACTION_LABEL[t.action];
              const color = riskColor(t.severity);
              return (
                <div key={i} style={{ padding: "9px 11px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(148,163,184,0.1)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: "#fca5a5" }}>„{t.phrase}"</span>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color }}>{t.severity}/100</span>
                      <span style={{ fontSize: 9.5, fontWeight: 800, color: action.color, background: action.color + "1a", padding: "1px 8px", borderRadius: 10 }}>{action.label}</span>
                    </div>
                  </div>
                  <p style={{ margin: "0 0 3px", fontSize: 12, color: "#94a3b8" }}>{t.why}</p>
                  <p style={{ margin: "0 0 3px", fontSize: 11.5, color: "#94a3b8" }}><span style={{ color: "#64748b" }}>zaatakuje: </span>{t.whoWillAttack}</p>
                  <p style={{ margin: "0 0 3px", fontSize: 11.5, color: "#94a3b8" }}><span style={{ color: "#64748b" }}>wytną jako: </span>{t.howClipped}</p>
                  <p style={{ margin: 0, fontSize: 11.5, color: "#7dd3fc" }}><span style={{ color: "#64748b" }}>zamiast tego: </span>{t.alternative}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
