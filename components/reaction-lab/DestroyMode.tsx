"use client";

import type { WorstCaseInterpretation } from "@/lib/reaction-simulator/types";
import { SectionHeading } from "./primitives";

function Row(p: { label: string; value: string }) {
  return (
    <div style={{ padding: "9px 0", borderBottom: "1px solid rgba(248,113,113,0.1)" }}>
      <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fca5a5", marginBottom: 3 }}>{p.label}</div>
      <div style={{ fontSize: 13, color: "#fecaca", lineHeight: 1.5 }}>„{p.value}"</div>
    </div>
  );
}

export function DestroyMode(p: { data: WorstCaseInterpretation }) {
  const d = p.data;
  return (
    <div className="pdm-panel pdm-panel-danger" style={{ padding: "16px 16px 8px" }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <SectionHeading icon="💥" title="Destroy Mode — najgorsze możliwe odczytanie" subtitle="Jak przeciwnik złośliwie przeczyta ten komunikat" />
        <Row label="Cytat wyrwany z kontekstu" value={d.outOfContextQuote} />
        <Row label="Najgroźniejszy tweet przeciwnika" value={d.opponentTweet} />
        <Row label="Pasek telewizyjny" value={d.tvChyron} />
        <Row label="Tytuł portalu" value={d.portalHeadline} />
        <Row label="Pytanie dziennikarza" value={d.journalistQuestion} />
        <Row label="Zarzut fact-checkera" value={d.factCheckClaim} />
        <Row label="Komentarz rozczarowanego wyborcy" value={d.disappointedVoterComment} />
        <div style={{ padding: "9px 0" }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fca5a5", marginBottom: 3 }}>Memiczny skrót</div>
          <div style={{ fontSize: 13, color: "#fecaca", lineHeight: 1.5 }}>{d.memeSummary}</div>
        </div>
      </div>
    </div>
  );
}
