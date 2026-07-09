"use client";

import { useState } from "react";
import type { ApexResult, Scenario } from "@/lib/apex-grid/types";
import { getProduct } from "@/lib/apex-grid/products";
import { BulletList, CopyButton, EmptyNote, Panel, PriorityBadge, ScoreBar, SectionHeading } from "./primitives";

// ── Widok wyników — Apex Grid ──────────────────────────────────────────
// Hierarchia jest świadoma i nieprzypadkowa: DECYZJA NA GÓRZE, dowody pod
// spodem (zasada "decyzja przed analizą" z dokumentu koncepcyjnego).
// Kolejność: pakiet decyzyjny → gotowe linie → kontrgra → mapa skutków →
// wiedza/interpretacja/do-sprawdzenia → scenariusze → głosy narady →
// materiał dowodowy (Insight Base + monitoring). Wszystko poniżej decyzji
// jest do rozwijania, nie do obowiązkowego czytania.

function FallbackBanner(p: { result: ApexResult }) {
  const r = p.result;
  const notes: string[] = [];
  if (!r.modelInfo.isReal) notes.push("Brak skonfigurowanego klucza AI — całość to szkielet lokalny, nie realna analiza.");
  if (r.modelInfo.isReal && r.decisionUsedFallback) notes.push("Pakiet decyzyjny to fallback lokalny (odpowiedź AI nie przeszła walidacji) — nie używaj go operacyjnie.");
  if (r.modelInfo.isReal && r.scenariosUsedFallback) notes.push("Scenariusze to fallback lokalny — potraktuj jako szkielet do ponownego przebiegu.");
  if (r.modelInfo.isReal && r.council.usedFallback.length > 0) notes.push(`Głosy narady bez realnej odpowiedzi AI: ${r.council.usedFallback.length}.`);
  if (notes.length === 0) return null;
  return (
    <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)", color: "#fcd34d", fontSize: 12 }}>
      {notes.map((n, i) => <div key={i}>⚠ {n}</div>)}
    </div>
  );
}

function DecisionPanel(p: { result: ApexResult }) {
  const d = p.result.decision;
  const product = getProduct(p.result.input.product);
  return (
    <Panel padding="18px 18px 16px">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#818cf8", marginBottom: 3 }}>
            {product.label}
          </div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#f1f5f9" }}>{d.caseTitle}</h2>
        </div>
        <PriorityBadge priority={d.priority} />
      </div>

      <div style={{ padding: "13px 15px", borderRadius: 10, background: "linear-gradient(135deg, rgba(99,102,241,0.16), rgba(56,189,248,0.08))", border: "1px solid rgba(129,140,248,0.35)", marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#a5b4fc", marginBottom: 5 }}>Decyzja</div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "#f1f5f9", lineHeight: 1.5 }}>{d.decision}</div>
      </div>

      <div style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.6 }}>{d.rationale}</div>
    </Panel>
  );
}

function MessagesPanel(p: { result: ApexResult }) {
  const d = p.result.decision;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <SectionHeading icon="🗣" title="Gotowe linie przekazu" subtitle="Do wypowiedzenia wprost — test ulicy: konkret, nie ściema." />
          <CopyButton text={d.messageLines.join("\n")} label="kopiuj wszystkie" />
        </div>
        {d.messageLines.length === 0 ? (
          <EmptyNote>Brak gotowych linii w tym przebiegu.</EmptyNote>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {d.messageLines.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 10px", borderRadius: 8, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.18)" }}>
                <span style={{ fontSize: 12.5, color: "#d1fae5", lineHeight: 1.5, flex: 1 }}>{line}</span>
                <CopyButton text={line} />
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel>
        <SectionHeading icon="🚫" title="Czego nie mówić" subtitle="Sformułowania, które natychmiast obrócą się przeciw politykowi." />
        {d.thingsNotToSay.length === 0 ? <EmptyNote>Brak wskazań w tym przebiegu.</EmptyNote> : <BulletList items={d.thingsNotToSay} color="#fda4af" />}
      </Panel>
    </div>
  );
}

function CounterPlaysPanel(p: { result: ApexResult }) {
  const plays = p.result.decision.counterPlays;
  return (
    <Panel>
      <SectionHeading icon="⚔️" title="Kontrgra" subtitle="Przewidywany kontratak i przygotowana odpowiedź — zanim atak padnie." />
      {plays.length === 0 ? (
        <EmptyNote>Brak przewidzianych kontrataków w tym przebiegu.</EmptyNote>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {plays.map((cp, i) => (
            <div key={i} style={{ borderRadius: 10, border: "1px solid rgba(148,163,184,0.16)", overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", background: "rgba(248,113,113,0.08)", fontSize: 12, color: "#fca5a5" }}>
                <strong style={{ fontWeight: 800 }}>Atak:</strong> {cp.expectedAttack}
              </div>
              <div style={{ padding: "8px 12px", display: "flex", gap: 8, alignItems: "flex-start", background: "rgba(74,222,128,0.05)", fontSize: 12, color: "#bbf7d0" }}>
                <span style={{ flex: 1 }}><strong style={{ fontWeight: 800 }}>Odpowiedź:</strong> {cp.response}</span>
                <CopyButton text={cp.response} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function ConsequencesPanel(p: { result: ApexResult }) {
  const m = p.result.decision.consequenceMap;
  const cols: Array<{ label: string; items: string[] }> = [
    { label: "Politycznie", items: m.political },
    { label: "Media", items: m.media },
    { label: "Społecznie", items: m.social },
    { label: "Internet", items: m.internet },
  ];
  return (
    <Panel>
      <SectionHeading icon="🗺" title="Mapa skutków" subtitle="Co się stanie po podjęciu decyzji — zanim zostanie podjęta." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        {cols.map((c) => (
          <div key={c.label}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>{c.label}</div>
            {c.items.length === 0 ? <EmptyNote>Brak.</EmptyNote> : <BulletList items={c.items} />}
          </div>
        ))}
      </div>
      {p.result.decision.planB && (
        <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: 8, background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.22)", fontSize: 12, color: "#fde68a" }}>
          <strong style={{ fontWeight: 800 }}>Plan B:</strong> {p.result.decision.planB}
        </div>
      )}
    </Panel>
  );
}

function EpistemicsPanel(p: { result: ApexResult }) {
  const d = p.result.decision;
  const cols: Array<{ label: string; items: string[]; color: string }> = [
    { label: "Co wiemy (z danych)", items: d.whatWeKnow, color: "#86efac" },
    { label: "Co zakładamy (interpretacja)", items: d.whatWeAssume, color: "#7dd3fc" },
    { label: "Co sprawdzić przed użyciem", items: d.whatToVerify, color: "#fbbf24" },
  ];
  return (
    <Panel>
      <SectionHeading icon="🧭" title="Wiedza, interpretacja, weryfikacja" subtitle="Twarde oddzielenie faktów od hipotez — zasada zero halucynacji." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
        {cols.map((c) => (
          <div key={c.label}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: c.color, marginBottom: 6 }}>{c.label}</div>
            {c.items.length === 0 ? <EmptyNote>Brak pozycji.</EmptyNote> : <BulletList items={c.items} />}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function ScenarioCard(p: { scenario: Scenario; chosen: boolean }) {
  const s = p.scenario;
  const [open, setOpen] = useState(p.chosen);
  return (
    <div
      style={{
        borderRadius: 12,
        border: p.chosen ? "1px solid rgba(129,140,248,0.55)" : "1px solid rgba(148,163,184,0.14)",
        background: p.chosen ? "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(15,23,42,0.4))" : "rgba(15,23,42,0.4)",
        padding: "13px 14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: p.chosen ? "#c7d2fe" : "#64748b", border: `1px solid ${p.chosen ? "rgba(129,140,248,0.5)" : "rgba(148,163,184,0.25)"}`, borderRadius: 6, padding: "1px 7px" }}>{s.id}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#e2e8f0" }}>{s.label}</span>
        </div>
        {p.chosen && (
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#a5b4fc", whiteSpace: "nowrap" }}>✓ wybrany</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.55, marginBottom: 10 }}>{s.summary}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
        <ScoreBar label="ryzyko" value={s.riskScore} color="#f87171" />
        <ScoreBar label="zysk" value={s.gainScore} color="#4ade80" />
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#818cf8" }}
      >
        {open ? "▾ zwiń przebieg" : "▸ pokaż przebieg i reakcje"}
      </button>
      {open && (
        <div style={{ marginTop: 9, display: "flex", flexDirection: "column", gap: 7, fontSize: 11.5, color: "#94a3b8", lineHeight: 1.55 }}>
          {s.keyRisk && <div><strong style={{ color: "#fca5a5", fontWeight: 800 }}>Kluczowe ryzyko:</strong> {s.keyRisk}</div>}
          {s.keyGain && <div><strong style={{ color: "#86efac", fontWeight: 800 }}>Kluczowy zysk:</strong> {s.keyGain}</div>}
          {s.opponentsReaction && <div><strong style={{ color: "#e2e8f0", fontWeight: 800 }}>Przeciwnicy:</strong> {s.opponentsReaction}</div>}
          {s.mediaReaction && <div><strong style={{ color: "#e2e8f0", fontWeight: 800 }}>Media:</strong> {s.mediaReaction}</div>}
          {s.ownBaseReaction && <div><strong style={{ color: "#e2e8f0", fontWeight: 800 }}>Własne zaplecze:</strong> {s.ownBaseReaction}</div>}
          {(s.timeline.h48 || s.timeline.d7 || s.timeline.d30) && (
            <div style={{ borderTop: "1px solid rgba(148,163,184,0.12)", paddingTop: 7, display: "flex", flexDirection: "column", gap: 4 }}>
              {s.timeline.h48 && <div><strong style={{ color: "#e2e8f0", fontWeight: 800 }}>48 godzin:</strong> {s.timeline.h48}</div>}
              {s.timeline.d7 && <div><strong style={{ color: "#e2e8f0", fontWeight: 800 }}>7 dni:</strong> {s.timeline.d7}</div>}
              {s.timeline.d30 && <div><strong style={{ color: "#e2e8f0", fontWeight: 800 }}>30 dni:</strong> {s.timeline.d30}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScenariosPanel(p: { result: ApexResult }) {
  return (
    <Panel>
      <SectionHeading icon="🧩" title="Scenariusze" subtitle="Warianty działania z osią czasu — łącznie ze świadomą bezczynnością." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 12 }}>
        {p.result.scenarios.map((s) => (
          <ScenarioCard key={s.id} scenario={s} chosen={s.id === p.result.decision.chosenScenarioId} />
        ))}
      </div>
    </Panel>
  );
}

function CouncilPanel(p: { result: ApexResult }) {
  const [open, setOpen] = useState(false);
  const c = p.result.council;
  return (
    <Panel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <SectionHeading icon="🎓" title={`Głosy narady (${c.opinions.length})`} subtitle="Eksperci Konsylium dobrani do produktu — pełna narada dziesięciu głosów dostępna w module Konsylium." />
        <button type="button" onClick={() => setOpen(!open)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#818cf8" }}>
          {open ? "▾ zwiń" : "▸ rozwiń"}
        </button>
      </div>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
          {c.opinions.map((o) => (
            <div key={o.expertId} style={{ borderRadius: 10, border: "1px solid rgba(148,163,184,0.14)", padding: "10px 12px", background: "rgba(15,23,42,0.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#e2e8f0" }}>{o.expertName}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: o.confidence === "high" ? "#86efac" : o.confidence === "low" ? "#fca5a5" : "#fbbf24" }}>
                  {o.confidence === "high" ? "wysoka pewność" : o.confidence === "low" ? "niska pewność" : "średnia pewność"}
                </span>
              </div>
              <div style={{ fontSize: 12.5, color: "#c7d2fe", fontWeight: 700, marginBottom: 4 }}>{o.headline}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.55 }}>{o.diagnosis}</div>
              {o.recommendations.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <BulletList items={o.recommendations} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function EvidencePanel(p: { result: ApexResult }) {
  const [open, setOpen] = useState(false);
  const { signal, ground } = p.result;
  return (
    <Panel>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <SectionHeading
          icon="📚"
          title="Materiał dowodowy"
          subtitle={`Monitoring: ${signal.totalFound} materiałów · Insight Base: ${ground.syntheses.length} syntez, ${ground.findings.length} wyników`}
        />
        <button type="button" onClick={() => setOpen(!open)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#818cf8" }}>
          {open ? "▾ zwiń" : "▸ rozwiń"}
        </button>
      </div>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginTop: 6 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>
              Sygnał · monitoring mediów{signal.query ? ` (frazy: ${signal.query})` : ""}
            </div>
            {signal.sources.length === 0 ? (
              <EmptyNote>Brak materiałów w przeszukanym oknie.</EmptyNote>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {signal.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: "#7dd3fc", textDecoration: "none", lineHeight: 1.45 }}>
                    {s.title} <span style={{ color: "#475569" }}>({s.source}{s.publishedAt ? ", " + s.publishedAt.slice(0, 10) : ""})</span>
                  </a>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "#94a3b8", marginBottom: 6 }}>
              Grunt · Insight Base
            </div>
            {!ground.hasData ? (
              <EmptyNote>Brak dopasowanych badań o grupach dla tej sprawy — reakcje grup w analizie są hipotezami, nie danymi.</EmptyNote>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ground.syntheses.map((s, i) => (
                  <div key={"s" + i} style={{ fontSize: 11.5, color: "#cbd5e1", lineHeight: 1.5 }}>
                    <strong style={{ color: "#c7d2fe", fontWeight: 800 }}>[synteza]</strong> {s.text}
                    {s.divergenceNote && <span style={{ color: "#fbbf24" }}> Rozbieżność źródeł: {s.divergenceNote}</span>}
                  </div>
                ))}
                {ground.findings.slice(0, 8).map((f, i) => (
                  <div key={"f" + i} style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.5 }}>
                    <span style={{ color: "#cbd5e1" }}>{f.topic}:</span> {f.value !== null ? f.value : f.valueText ?? "b.d."}{" "}
                    <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#7dd3fc", textDecoration: "none" }}>
                      ({f.studyTitle}{f.publishedDate ? ", " + f.publishedDate : ""})
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

export function ResultsView(p: { result: ApexResult }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <FallbackBanner result={p.result} />
      <DecisionPanel result={p.result} />
      <MessagesPanel result={p.result} />
      <CounterPlaysPanel result={p.result} />
      <ConsequencesPanel result={p.result} />
      <EpistemicsPanel result={p.result} />
      <ScenariosPanel result={p.result} />
      <CouncilPanel result={p.result} />
      <EvidencePanel result={p.result} />
      <div style={{ fontSize: 10, color: "#475569", textAlign: "right" }}>
        {p.result.modelInfo.isReal ? `Silnik: ${p.result.modelInfo.provider}` : "Tryb lokalny (bez AI)"} · {new Date(p.result.createdAt).toLocaleString("pl-PL")}
      </div>
    </div>
  );
}
