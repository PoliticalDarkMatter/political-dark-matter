"use client";

import { useCallback, useRef, useState } from "react";
import type {
  ImageLabMode, ImageReactionSimulationResult, ImageSimulationInput, ImageStageId, ImageStageStatus,
} from "@/lib/image-reaction-simulator/types";
import { InputPanel, type ImageInputPayload } from "@/components/image-lab/InputPanel";
import { AIAnalysisProgress } from "@/components/image-lab/AIAnalysisProgress";
import { VerdictCard } from "@/components/image-lab/VerdictCard";
import { ImagePreviewHotspots } from "@/components/image-lab/ImagePreviewHotspots";
import { VisualRiskScores } from "@/components/image-lab/VisualRiskScores";
import { MemePotentialPanel } from "@/components/image-lab/MemePotentialPanel";
import { VisualPrecedentPanel } from "@/components/image-lab/VisualPrecedentPanel";
import { SegmentImageHeatmap } from "@/components/image-lab/SegmentImageHeatmap";
import { OpponentImageRoom } from "@/components/image-lab/OpponentImageRoom";
import { MediaImageRoom } from "@/components/image-lab/MediaImageRoom";
import { CaptionRoom } from "@/components/image-lab/CaptionRoom";
import { EvolutionTimeline } from "@/components/image-lab/EvolutionTimeline";
import { StrategicRecommendationCard } from "@/components/image-lab/StrategicRecommendationCard";
import { ModeSwitcher, MODE_META } from "@/components/image-lab/ModeSwitcher";

// ── Political Image Reaction Simulator / Visual Narrative Lab ─────────
// Ten sam wzorzec streamingu NDJSON co app/reaction-lab/page.tsx: klient
// czyta odpowiedź /api/image-reaction-simulator linia po linii, więc
// AIAnalysisProgress aktualizuje się etapami zamiast czekać w bezruchu.
// previewUrl zdjęcia (object URL, tylko w przeglądarce) jest trzymany
// osobno od wyniku — obraz nigdy nie wraca z API (patrz orchestrator.ts:
// `input` w wyniku ma pominięte pole imageBase64).

export default function ImageLabPage() {
  const [running, setRunning] = useState(false);
  const [stageStatuses, setStageStatuses] = useState<Partial<Record<ImageStageId, ImageStageStatus>>>({});
  const [result, setResult] = useState<ImageReactionSimulationResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ImageLabMode>("pelny");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const imageDataRef = useRef<{ base64: string; mimeType: string } | null>(null);

  const runSimulation = useCallback(async (payload: ImageInputPayload) => {
    setRunning(true);
    setError(null);
    setResult(null);
    setStageStatuses({});
    setMode("pelny");
    setPreviewUrl(payload.prepared.previewUrl);
    imageDataRef.current = { base64: payload.prepared.analysisBase64, mimeType: payload.prepared.mimeType };

    const controller = new AbortController();
    abortRef.current = controller;

    const input: Partial<ImageSimulationInput> = {
      imageBase64: payload.prepared.analysisBase64,
      mimeType: payload.prepared.mimeType,
      width: payload.prepared.originalWidth,
      height: payload.prepared.originalHeight,
      fileSizeBytes: payload.prepared.fileSizeBytes,
      who: payload.who,
      additionalContext: payload.additionalContext,
      topic: payload.topic,
      channel: payload.channel,
      goal: payload.goal,
      eventType: payload.eventType,
      isCrisisResponse: payload.isCrisisResponse,
      isCounterAttack: payload.isCounterAttack,
      riskTolerance: payload.riskTolerance,
    };

    try {
      const res = await fetch("/api/image-reaction-simulator", {
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
            setResult(obj.result as ImageReactionSimulationResult);
          } else if (obj.stage) {
            setStageStatuses((prev) => ({ ...prev, [obj.stage as ImageStageId]: obj.status as ImageStageStatus }));
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
      const img = imageDataRef.current;
      const res = await fetch("/api/image-reaction-simulator/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, imageBase64: img?.base64, mimeType: img?.mimeType }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Nie udało się wygenerować raportu PDF.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "raport-symulator-zdjec.pdf";
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
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
        <div>
          <div className="pdm-kicker">Political Dark Matter · Narrative Scope</div>
          <h1 className="pdm-hero-title" style={{ fontSize: 28, lineHeight: 1.1 }}>Political Image Reaction Simulator</h1>
        </div>
        <div className="pdm-live-pill" style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20 }}>
          <span className="pdm-live-dot" />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#86efac" }}>VISUAL NARRATIVE LAB</span>
        </div>
      </div>
      <p style={{ margin: "0 0 18px", fontSize: 12.5, color: "#64748b", maxWidth: 760 }}>
        Cyfrowy war room wizualny: przetestuj zdjęcie przed publikacją i zobacz, jak przeczytają je media, przeciwnicy, konta memiczne i własny elektorat. To radar konsekwencji wizualnych, nie generator ładnych podpisów.
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

            {previewUrl && (showAll || mode === "meme") && (
              <ImagePreviewHotspots previewUrl={previewUrl} hotspots={result.riskHotspots} observation={result.imageObservation} />
            )}

            {showAll && <VisualRiskScores factors={result.visualRiskFactors} />}

            {(showAll || mode === "meme") && (
              <MemePotentialPanel potential={result.memePotential} scenarios={result.memeScenarios} />
            )}

            {(showAll || mode === "meme") && (
              <VisualPrecedentPanel precedents={result.visualPrecedents} />
            )}

            {(showAll || mode === "segments") && (
              <SegmentImageHeatmap segments={result.segmentReactions} />
            )}

            {(showAll || mode === "opponent") && (
              <OpponentImageRoom attacks={result.opponentAttacks} />
            )}

            {(showAll || mode === "media") && (
              <MediaImageRoom frames={result.mediaFrames} />
            )}

            {(showAll || mode === "caption") && (
              <CaptionRoom recommendations={result.captionRecommendations} risks={result.captionRisks} />
            )}

            {(showAll || mode === "evolution") && (
              <EvolutionTimeline stages={result.evolutionTimeline} />
            )}

            {showAll && (
              <StrategicRecommendationCard
                rec={result.strategicRecommendation}
                crops={result.cropRecommendations}
                altUses={result.alternativeUseRecommendations}
                platformFit={result.platformFit}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
