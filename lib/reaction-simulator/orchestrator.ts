// ── Orchestrator ────────────────────────────────────────────────────────
// Serce Political Reaction Simulator. Rozbija analizę na wyspecjalizowane
// kroki zamiast jednego mega-promptu (sekcja 2.6 / 3 specyfikacji):
//
//   local_scan  → deterministyczny, natychmiastowy (bez LLM)
//   contextual  ┐
//   segments    │  4 wywołania LLM RÓWNOLEGLE — żadne nie zależy
//   opponents   │  od wyniku innego, więc czekanie sekwencyjne byłoby
//   media       │  czystą stratą czasu (megawydajność, sekcja 3.6)
//   rewrite     ┘
//   final       → sekwencyjnie po powyższych, dostaje ich skrót (digest)
//
// Każdy etap emituje StageEvent przez onEvent() w chwili startu i w
// chwili zakończenia — API route (app/api/reaction-simulator/route.ts)
// przekazuje te eventy dalej jako strumień NDJSON do klienta, więc UI
// renderuje sekcje etapami, a nie czeka na jeden wielki JSON na końcu.
//
// DOCELOWO — miejsca do podpięcia realnych danych zamiast czystego LLM:
//   - segments: zasilić realnym social listeningiem / danymi sondażowymi
//     zamiast prosić model o czystą symulację reakcji.
//   - contextual/media: podpiąć Narrative Memory (archiwum historycznych
//     przypadków politycznych) jako few-shot przykłady w promptcie.
//   - opponents: podpiąć Influence Graph, żeby "kto zaatakuje pierwszy"
//     opierało się na realnej sieci aktorów, nie na samej heurystyce LLM.
//   - final: dodać pętlę kalibracji (porównanie predykcji z tym, co
//     faktycznie się wydarzyło po publikacji — patrz sekcja 16.4).

import { getAIProvider, type AIProvider } from "./ai-provider";
import { runLocalScan } from "./local-scan";
import {
  buildContextualPrompt, buildFinalPrompt, buildMediaPrompt,
  buildOpponentsPrompt, buildRewritePrompt, buildSegmentsPrompt,
} from "./prompts";
import {
  extractJson, validateContextual, validateFinal, validateMedia,
  validateOpponents, validateRewrite, validateSegments,
} from "./validate";
import {
  mockContextual, mockFinal, mockMedia, mockOpponents, mockRewrite, mockSegments,
} from "./mock-generators";
import type { ReactionSimulationResult, SimulationInput, StageEvent, StageId } from "./types";

const STAGE_LABELS: Record<StageId, string> = {
  local_scan: "Local Pre-Scan",
  contextual: "Risk Engine",
  segments: "Segment Simulation",
  opponents: "Opponent Room",
  media: "Media Room",
  rewrite: "Rewrite Room",
  final: "Final Recommendation",
};

function digestForFinal(parts: {
  contextual: ReturnType<typeof mockContextual>;
  segments: ReturnType<typeof mockSegments>;
  opponents: ReturnType<typeof mockOpponents>;
  media: ReturnType<typeof mockMedia>;
  rewrite: ReturnType<typeof mockRewrite>;
}): string {
  const worstSegments = [...parts.segments].sort((a, b) => b.outrage - a.outrage).slice(0, 3);
  const worstAttacks = [...parts.opponents].sort((a, b) => b.severity - a.severity).slice(0, 3);
  const worstFlags = parts.contextual.redFlags.slice(0, 3);
  const bestVariant = parts.rewrite.counterfactualVariants.find((v) => v.type === parts.rewrite.recommendedVariantType) ?? parts.rewrite.counterfactualVariants[0];
  return [
    `Najbardziej oburzone segmenty: ${worstSegments.map((s) => `${s.segment} (oburzenie ${s.outrage}/100, emocja: ${s.emotion})`).join("; ") || "brak danych"}.`,
    `Najsilniejsze ataki przeciwników: ${worstAttacks.map((a) => `${a.vector}: ${a.attack}`).join(" | ") || "brak danych"}.`,
    `Główne red flags: ${worstFlags.map((f) => `${f.type} (${f.severity}/100)`).join(", ") || "brak"}.`,
    `Najwyższe ryzyko medialne: ${parts.media.mediaFrames.filter((m) => m.riskLevel === "wysokie").map((m) => m.category).join(", ") || "brak kategorii wysokiego ryzyka"}.`,
    `Najgorsze możliwe odczytanie (destroy mode): "${parts.contextual.worstCaseInterpretation.outOfContextQuote}".`,
    `Rekomendowany wariant przepisania: ${bestVariant ? `${bestVariant.label} — "${bestVariant.text.slice(0, 200)}"` : "brak"}.`,
  ].join("\n");
}

export async function runOrchestration(
  input: SimulationInput,
  onEvent: (e: StageEvent) => void
): Promise<ReactionSimulationResult> {
  const provider: AIProvider = getAIProvider();
  const usedFallback: StageId[] = [];

  // ── Krok 1: Local Pre-Scan (natychmiastowy, bez LLM) ──────────────
  const localScan = runLocalScan(input);
  onEvent({ stage: "local_scan", status: "gotowe", label: STAGE_LABELS.local_scan, data: localScan });

  // ── Kroki 2-6: cztery/pięć wywołań LLM równolegle ─────────────────
  const stageIds: StageId[] = ["contextual", "segments", "opponents", "media", "rewrite"];
  for (const s of stageIds) onEvent({ stage: s, status: "analizuje", label: STAGE_LABELS[s] });

  async function runStage<T>(
    stage: StageId,
    prompt: string,
    validate: (d: unknown) => T | null,
    mockFn: () => T
  ): Promise<T> {
    const raw = provider.isReal ? await provider.generateText(prompt) : null;
    const parsed = extractJson(raw);
    const validated = parsed ? validate(parsed) : null;
    if (validated) {
      onEvent({ stage, status: "gotowe", label: STAGE_LABELS[stage] });
      return validated;
    }
    usedFallback.push(stage);
    const mocked = mockFn();
    onEvent({ stage, status: "fallback", label: STAGE_LABELS[stage], error: provider.isReal ? "Odpowiedź AI nie przeszła walidacji — użyto lokalnego fallbacku." : "Brak skonfigurowanego klucza AI — użyto lokalnego fallbacku." });
    return mocked;
  }

  const [contextual, segments, opponents, media, rewrite] = await Promise.all([
    runStage("contextual", buildContextualPrompt(input, localScan), validateContextual, () => mockContextual(input, localScan)),
    runStage("segments", buildSegmentsPrompt(input, localScan), validateSegments, () => mockSegments(localScan)),
    runStage("opponents", buildOpponentsPrompt(input, localScan), validateOpponents, () => mockOpponents(localScan)),
    runStage("media", buildMediaPrompt(input, localScan), validateMedia, () => mockMedia(localScan)),
    runStage("rewrite", buildRewritePrompt(input, localScan), validateRewrite, () => mockRewrite(input)),
  ]);

  // ── Krok 7: Final Recommendation — sekwencyjnie, po digest'cie ────
  onEvent({ stage: "final", status: "analizuje", label: STAGE_LABELS.final });
  const digest = digestForFinal({ contextual, segments, opponents, media, rewrite });
  const finalRaw = provider.isReal ? await provider.generateText(buildFinalPrompt(input, localScan, digest), { maxTokens: 1400 }) : null;
  const finalParsed = extractJson(finalRaw);
  let final = finalParsed ? validateFinal(finalParsed) : null;
  if (!final) {
    usedFallback.push("final");
    final = mockFinal(localScan);
    onEvent({ stage: "final", status: "fallback", label: STAGE_LABELS.final, error: "Rekomendacja końcowa oparta o fallback lokalny." });
  } else {
    onEvent({ stage: "final", status: "gotowe", label: STAGE_LABELS.final });
  }

  return {
    input,
    localScan,
    verdict: final.verdict,
    summary: final.summary,
    overallScores: final.overallScores,
    segmentReactions: segments,
    mediaFrames: media.mediaFrames,
    triggerPhrases: contextual.triggerPhrases,
    worstCaseInterpretation: contextual.worstCaseInterpretation,
    opponentAttacks: opponents,
    escalationTimeline: media.escalationTimeline,
    counterfactualVariants: rewrite.counterfactualVariants,
    recommendedVariantType: rewrite.recommendedVariantType,
    strategicRecommendation: final.strategicRecommendation,
    silenceTest: final.silenceTest,
    redFlags: contextual.redFlags,
    uncertaintyLevel: final.uncertaintyLevel,
    aiConfidenceNotes: final.aiConfidenceNotes,
    dataLimitations: final.dataLimitations,
    generatedAt: new Date().toISOString(),
    usedFallback,
  };
}
