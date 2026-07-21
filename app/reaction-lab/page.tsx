"use client";

import { useCallback, useRef, useState } from "react";
import type { LabMode, ReactionSimulationResult, SimulationInput, StageId, StageStatus } from "@/lib/reaction-simulator/types";
import { InputPanel } from "@/components/reaction-lab/InputPanel";
import { AIAnalysisProgress } from "@/components/reaction-lab/AIAnalysisProgress";
import { VerdictCard } from "@/components/reaction-lab/VerdictCard";
import { SegmentHeatmap } from "@/components/reaction-lab/SegmentHeatmap";
import { DestroyMode } from "@/components/reaction-lab/DestroyMode";
import { MediaRoom } from "@/components/reaction-lab/MediaRoom";
import { OpponentRoom } from "@/components/reaction-lab/OpponentRoom";
import { EscalationTimeline } from "@/components/reaction-lab/EscalationTimeline";
import { TriggerScanner } from "@/components/reaction-lab/TriggerScanner";
import { CounterfactualVariants } from "@/components/reaction-lab/CounterfactualVariants";
import { StrategicRecommendationCard } from "@/components/reaction-lab/StrategicRecommendation";
import { ModeSwitcher, MODE_META } from "@/components/reaction-lab/ModeSwitcher";

// ── Political Reaction Simulator / Narrative Impact Lab ───────────────
// Klient czyta odpowiedź /api/reaction-simulator jako strumień NDJSON
// (jeden JSON na linię) — dzięki temu AIAnalysisProgress aktualizuje się
// etapami, a nie czeka w bezruchu na jeden wielki wynik na końcu. Ostatni
// obiekt z polem "result" niesie pełny, strukturalny ReactionSimulationResult.

export default function ReactionLabPage() {
  const [running, setRunning] = useState(false);
  const [stageStatuses, setStageStatuses] = useState<Partial<Record<StageId, StageStatus>>>({});
  const [result, setResult] = useState<ReactionSimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<LabMode>("pelny");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runSimulation = useCallback(async (input: SimulationInput) => {
    setRunning(true);
    setError(null);
    setResult(null);
    setStageStatuses({});
    setMode("pelny");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/reaction-simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Nie udało się uruchomić symulacji.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let obj: Record<string, unknown>;
          try { obj = JSON.parse(line); } catch { continue; }
          if (obj.result) {
            setResult(obj.result as ReactionSimulationResult);
          } else if (obj.stage) {
            setStageStatuses((prev) => ({ ...prev, [obj.stage as StageId]: obj.status as StageStatus }));
            if (obj.status === "blad" && obj.error) setError(String(obj.error));
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, []);

  function cancel() {
    abortRef.current?.abort();
    setRunning(false);
  }

  async function generateReport() {
    if (!result) return;
    setReportBusy(true);
    setReportError(null);
    try {
      const res = await fetch("/api/reaction-simulator/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Nie udało się wygenerować raportu PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "raport-symulator-reakcji.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Nie udało się wygenerować raportu PDF.");
    } finally {
      setReportBusy(false);
    }
  }

  const question = MODE_META[mode].question;
  const showAll = mode === "pelny";

  return (
    <div style={{ padding: "18px 24px 40px", minHeight: "100%", fontFamily: "'Inter', system-ui, sans-serif", color: "#e2e8f0" }}>
      {/* Nagłówek modułu */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
        <div>
          <div className="pdm-kicker">IMPACT CENTER · Narrative Scope</div>
          <h1 className="pdm-hero-title" style={{ fontSize: 28, lineHeight: 1.1 }}>Political Reaction Simulator</h1>
        </div>
        <div className="pdm-live-pill" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20 }}>
          <span className="pdm-live-dot" />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#86efac" }}>NARRATIVE IMPACT LAB</span>
        </div>
      </div>
      <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "#64748b", maxWidth: 720 }}>
        Cyfrowy war room: przetestuj jeszcze niewypowiedziane słowa i planowane ruchy, zanim pójdą w świat. To radar konsekwencji, nie generator tekstów — AI jest silnikiem analizy, nie dekoracją.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <InputPanel onSubmit={runSimulation} running={running} />

        {running && <AIAnalysisProgress statuses={stageStatuses} running={running} />}

        {running && (
          <button
            onClick={cancel}
            className="pdm-btn-square"
            style={{ alignSelf: "flex-start", padding: "6px 14px", borderRadius: 8, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
          >
            Anuluj analizę
          </button>
        )}

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 12.5 }}>
            ⚠ {error}
          </div>
        )}

        {result && !running && (
          <>
            <AIAnalysisProgress statuses={stageStatuses} running={false} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <ModeSwitcher mode={mode} onChange={setMode} />
              <button
                onClick={generateReport}
                disabled={reportBusy}
                className="pdm-btn-square"
                style={{ padding: "7px 16px", borderRadius: 8, background: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.3)", color: "#7dd3fc", fontSize: 12, fontWeight: 700, cursor: reportBusy ? "wait" : "pointer", whiteSpace: "nowrap" }}
              >
                {reportBusy ? "Generuję raport…" : "📄 Generuj raport PDF"}
              </button>
            </div>
            {reportError && (
              <div style={{ padding: "8px 12px", borderRadius: 8, background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", color: "#fca5a5", fontSize: 12 }}>
                ⚠ {reportError}
              </div>
            )}
            {mode !== "pelny" && (
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7dd3fc", marginTop: -8 }}>„{question}"</div>
            )}

            <VerdictCard result={result} />

            {(showAll || mode === "pre_mortem" || mode === "red_flags") && (
              <TriggerScanner text={result.input.text} phrases={result.triggerPhrases} />
            )}

            {(showAll || mode === "pre_mortem") && (
              <DestroyMode data={result.worstCaseInterpretation} />
            )}

            {(showAll || mode === "people") && (
              <SegmentHeatmap segments={result.segmentReactions} />
            )}

            {(showAll || mode === "opponent" || mode === "pre_mortem") && (
              <OpponentRoom attacks={result.opponentAttacks} />
            )}

            {(showAll || mode === "media") && (
              <MediaRoom frames={result.mediaFrames} />
            )}

            {(showAll || mode === "media") && (
              <EscalationTimeline stages={result.escalationTimeline} />
            )}

            {(showAll || mode === "rewrite") && (
              <CounterfactualVariants variants={result.counterfactualVariants} recommended={result.recommendedVariantType} />
            )}

            {(showAll || mode === "silence" || mode === "red_flags") && (
              <StrategicRecommendationCard rec={result.strategicRecommendation} silence={result.silenceTest} redFlags={result.redFlags} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
