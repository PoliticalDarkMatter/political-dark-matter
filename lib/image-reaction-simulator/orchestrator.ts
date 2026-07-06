// ── Orchestrator — Political Image Reaction Simulator ────────────────
// Ten sam princip co lib/reaction-simulator/orchestrator.ts: analiza
// rozbita na wyspecjalizowane kroki, nie jeden mega-prompt. RÓŻNICA
// kluczowa względem modułu tekstowego: tu jest twarda zależność
// sekwencyjna na starcie — 6 z 7 kroków tekstowych potrzebuje wyniku
// Vision Observation, więc:
//
//   local_scan          → deterministyczny, natychmiastowy (bez AI)
//   vision_observation  → JEDYNE wywołanie z obrazem (Gemini multimodal)
//   visual_risk         ┐
//   meme_potential      │
//   segments            │  7 wywołań LLM RÓWNOLEGLE — wszystkie działają
//   opponents           │  na TEKŚCIE (observation + local scan), obraz
//   media               │  nie jest wysyłany ponownie (oszczędność
//   caption             │  kosztu/tokenów — sekcja 3.6 specyfikacji:
//   evolution           ┘  "unikanie zbędnych wywołań Vision AI")
//   final               → sekwencyjnie po powyższych, dostaje digest
//
// Cache: prosty in-memory Map w tym module — działa w ramach jednego
// "ciepłego" procesu serverless (Vercel), NIE jest trwały między zimnymi
// startami ani między instancjami. To świadome ograniczenie na tym
// etapie (brak infrastruktury trwałego cache'u / Supabase Storage dla
// obrazów), odnotowane w dataLimitations. DOCELOWO: cache w Supabase
// keyed by hash obrazu, tak jak Narrative Memory w module tekstowym.

import { getVisionAIProvider, type VisionAIProvider } from "./ai-provider";
import { runImageLocalScan } from "./local-scan";
import { matchVisualPrecedents } from "./visual-precedents";
import {
  buildCaptionPrompt, buildEvolutionPrompt, buildFinalPrompt, buildHistoricalPrecedentPrompt, buildMediaPrompt,
  buildMemePrompt, buildObservationPrompt, buildOpponentsPrompt, buildRiskPrompt, buildSegmentsPrompt,
} from "./prompts";
import {
  extractJson, validateCaption, validateEvolution, validateFinal, validateHistoricalPrecedent, validateMedia,
  validateMeme, validateObservation, validateOpponents, validateRisk, validateSegments,
} from "./validate";
import {
  mockCaption, mockEvolution, mockFinal, mockHistoricalPrecedent, mockMedia, mockMeme, mockObservation, mockOpponents, mockRisk, mockSegments,
} from "./mock-generators";
import type {
  ImageReactionSimulationResult, ImageSimulationInput, ImageStageEvent, ImageStageId,
} from "./types";

const STAGE_LABELS: Record<ImageStageId, string> = {
  local_scan: "Local Image Pre-Scan",
  vision_observation: "Vision Observation",
  visual_risk: "Visual Risk Engine",
  meme_potential: "Meme Potential Engine",
  historical_precedent: "Visual Precedent Engine",
  segments: "Segment Simulation",
  opponents: "Opponent Room",
  media: "Media Room",
  caption: "Caption Room",
  evolution: "Evolution Timeline",
  final: "Final Recommendation",
};

// Cache best-effort, per-instancja (patrz komentarz na górze pliku).
const resultCache = new Map<string, ImageReactionSimulationResult>();

function hashKey(input: ImageSimulationInput): string {
  // djb2 nad próbką base64 (nie całym stringiem — wystarczy do
  // rozróżnienia obrazów, a szybsze niż hashowanie megabajtów danych)
  // plus pełen kontekst tekstowy, który też wpływa na wynik.
  const sample = input.imageBase64.slice(0, 4000) + input.imageBase64.length;
  const ctx = JSON.stringify({ who: input.who, topic: input.topic, channel: input.channel, goal: input.goal, eventType: input.eventType, isCrisisResponse: input.isCrisisResponse, isCounterAttack: input.isCounterAttack, riskTolerance: input.riskTolerance });
  let hash = 5381;
  const s = sample + ctx;
  for (let i = 0; i < s.length; i++) hash = ((hash * 33) ^ s.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

function digestForFinal(parts: {
  risk: ReturnType<typeof mockRisk>;
  meme: ReturnType<typeof mockMeme>;
  precedents: ReturnType<typeof mockHistoricalPrecedent>;
  segments: ReturnType<typeof mockSegments>;
  opponents: ReturnType<typeof mockOpponents>;
  media: ReturnType<typeof mockMedia>;
  caption: ReturnType<typeof mockCaption>;
  evolution: ReturnType<typeof mockEvolution>;
}): string {
  const worstRisks = [...parts.risk.visualRiskFactors].sort((a, b) => b.score - a.score).slice(0, 4);
  const worstSegments = [...parts.segments].sort((a, b) => b.risk - a.risk).slice(0, 3);
  const worstAttacks = [...parts.opponents].sort((a, b) => b.severity - a.severity).slice(0, 3);
  const worstMedia = parts.media.filter((m) => m.negativeUseRisk === "wysokie");
  const bestCaption = parts.caption.captionRecommendations.find((c) => c.disarmsRisk) ?? parts.caption.captionRecommendations[0];
  const peakEvolution = [...parts.evolution].sort((a, b) => b.intensity - a.intensity)[0];
  const topPrecedent = [...parts.precedents].sort((a, b) => b.matchStrength - a.matchStrength)[0];
  return [
    `Najsilniejsze ryzyka wizualne: ${worstRisks.map((r) => `${r.label} (${r.score}/100): ${r.reason}`).join("; ") || "brak danych"}.`,
    `Potencjał memiczny: ${parts.meme.memePotential.isMemeable ? `TAK (${parts.meme.memePotential.score}/100) — ${parts.meme.memePotential.mostMemeableElement}` : "niski"}.`,
    `Najbliższy wzorzec wizualny (precedens): ${topPrecedent ? `${topPrecedent.label} (dopasowanie ${topPrecedent.matchStrength}/100) — zwykle: ${topPrecedent.typicalOutcome}` : "brak wyraźnego dopasowania do znanych wzorców"}.`,
    `Najbardziej narażone segmenty: ${worstSegments.map((s) => `${s.segment} (ryzyko ${s.risk}/100, ${s.strengthensOrWeakens})`).join("; ") || "brak danych"}.`,
    `Najsilniejsze ataki przeciwników: ${worstAttacks.map((a) => `${a.vector}: ${a.attack}`).join(" | ") || "brak danych"}.`,
    `Media wysokiego ryzyka negatywnego wykorzystania: ${worstMedia.map((m) => m.category).join(", ") || "brak"}.`,
    `Rekomendowany podpis: ${bestCaption ? `${bestCaption.label} — "${bestCaption.text.slice(0, 160)}"` : "brak"}.`,
    `Szczyt natężenia w osi ewolucji: ${peakEvolution ? `${peakEvolution.window} (${peakEvolution.intensity}/100) — ${peakEvolution.whatMayHappen}` : "brak danych"}.`,
  ].join("\n");
}

export async function runImageOrchestration(
  input: ImageSimulationInput,
  onEvent: (e: ImageStageEvent) => void
): Promise<ImageReactionSimulationResult> {
  const cacheKey = hashKey(input);
  const cached = resultCache.get(cacheKey);
  if (cached) {
    for (const stage of Object.keys(STAGE_LABELS) as ImageStageId[]) {
      onEvent({ stage, status: "gotowe", label: STAGE_LABELS[stage] + " (z cache)" });
    }
    return cached;
  }

  const provider: VisionAIProvider = getVisionAIProvider();
  const usedFallback: ImageStageId[] = [];

  // ── Krok 1: Local Image Pre-Scan (natychmiastowy, bez AI) ─────────
  const localScan = runImageLocalScan(input);
  onEvent({ stage: "local_scan", status: "gotowe", label: STAGE_LABELS.local_scan, data: localScan });

  // ── Krok 2: Vision Observation (JEDYNE wywołanie z obrazem) ───────
  onEvent({ stage: "vision_observation", status: "analizuje", label: STAGE_LABELS.vision_observation });
  const obsRaw = provider.isReal
    ? await provider.generateFromImage(buildObservationPrompt(input, localScan), input.imageBase64, input.mimeType, { maxTokens: 1400 })
    : null;
  const obsParsed = extractJson(obsRaw);
  let observation = obsParsed ? validateObservation(obsParsed) : null;
  if (!observation) {
    usedFallback.push("vision_observation");
    observation = mockObservation(localScan);
    onEvent({ stage: "vision_observation", status: "fallback", label: STAGE_LABELS.vision_observation, error: provider.isReal ? "Model Vision AI nie zwrócił poprawnej odpowiedzi — użyto fallbacku lokalnego." : "Brak skonfigurowanego klucza AI — użyto fallbacku lokalnego." });
  } else {
    onEvent({ stage: "vision_observation", status: "gotowe", label: STAGE_LABELS.vision_observation });
  }

  async function runStage<T>(
    stage: ImageStageId,
    prompt: string,
    validate: (d: unknown) => T | null,
    mockFn: () => T,
    maxTokens = 2000
  ): Promise<T> {
    const raw = provider.isReal ? await provider.generateText(prompt, { maxTokens }) : null;
    const parsed = extractJson(raw);
    const validated = parsed ? validate(parsed) : null;
    if (validated) {
      onEvent({ stage, status: "gotowe", label: STAGE_LABELS[stage] });
      return validated;
    }
    usedFallback.push(stage);
    const mocked = mockFn();
    onEvent({ stage, status: "fallback", label: STAGE_LABELS[stage], error: provider.isReal ? "Odpowiedź AI nie przeszła walidacji (prawdopodobnie ucięty JSON) — użyto fallbacku." : "Brak skonfigurowanego klucza AI — użyto fallbacku." });
    return mocked;
  }

  // ── Krok 3: Visual Risk — osobno na starcie, bo historical_precedent
  // (poniżej) potrzebuje jego wyniku (visualRiskFactors) do dopasowania
  // lokalnego, zanim w ogóle zapyta LLM.
  onEvent({ stage: "visual_risk", status: "analizuje", label: STAGE_LABELS.visual_risk });
  const risk = await runStage("visual_risk", buildRiskPrompt(input, localScan, observation), validateRisk, mockRisk, 2600);

  // ── Kroki 4-9: sześć wywołań LLM równolegle, na tekście ───────────
  const candidates = matchVisualPrecedents(observation, risk.visualRiskFactors);
  const parallelStages: ImageStageId[] = ["meme_potential", "historical_precedent", "segments", "opponents", "media", "caption", "evolution"];
  for (const s of parallelStages) onEvent({ stage: s, status: "analizuje", label: STAGE_LABELS[s] });

  const [meme, historicalPrecedent, segments, opponents, media, caption, evolution] = await Promise.all([
    runStage("meme_potential", buildMemePrompt(input, localScan, observation), validateMeme, mockMeme, 2200),
    runStage("historical_precedent", buildHistoricalPrecedentPrompt(input, localScan, observation, candidates), validateHistoricalPrecedent, () => mockHistoricalPrecedent(candidates), 1800),
    runStage("segments", buildSegmentsPrompt(input, localScan, observation), validateSegments, mockSegments, 3400),
    runStage("opponents", buildOpponentsPrompt(input, localScan, observation), validateOpponents, mockOpponents, 2200),
    runStage("media", buildMediaPrompt(input, localScan, observation), validateMedia, mockMedia, 2600),
    runStage("caption", buildCaptionPrompt(input, localScan, observation), validateCaption, mockCaption, 3000),
    runStage("evolution", buildEvolutionPrompt(input, localScan, observation), validateEvolution, () => mockEvolution(localScan), 3400),
  ]);

  // ── Krok 10: Final Recommendation — sekwencyjnie, po digest'cie ───
  onEvent({ stage: "final", status: "analizuje", label: STAGE_LABELS.final });
  const digest = digestForFinal({ risk, meme, precedents: historicalPrecedent, segments, opponents, media, caption, evolution });
  const finalRaw = provider.isReal
    ? await provider.generateText(buildFinalPrompt(input, localScan, observation, digest), { maxTokens: 1800 })
    : null;
  const finalParsed = extractJson(finalRaw);
  let final = finalParsed ? validateFinal(finalParsed) : null;
  if (!final) {
    usedFallback.push("final");
    final = mockFinal(localScan);
    onEvent({ stage: "final", status: "fallback", label: STAGE_LABELS.final, error: "Rekomendacja końcowa oparta o fallback lokalny." });
  } else {
    onEvent({ stage: "final", status: "gotowe", label: STAGE_LABELS.final });
  }

  const { imageBase64: _omit, ...inputWithoutImage } = input;
  void _omit;

  const result: ImageReactionSimulationResult = {
    input: inputWithoutImage,
    localScan,
    verdict: final.verdict,
    summary: final.summary,
    imageObservation: observation,
    overallScores: final.overallScores,
    visualRiskFactors: risk.visualRiskFactors,
    riskHotspots: risk.riskHotspots,
    memePotential: meme.memePotential,
    memeScenarios: meme.memeScenarios,
    visualPrecedents: historicalPrecedent,
    segmentReactions: segments,
    mediaFrames: media,
    opponentAttacks: opponents,
    captionRisks: caption.captionRisks,
    captionRecommendations: caption.captionRecommendations,
    platformFit: localScan.platformFit,
    evolutionTimeline: evolution,
    cropRecommendations: final.cropRecommendations,
    alternativeUseRecommendations: final.alternativeUseRecommendations,
    strategicRecommendation: final.strategicRecommendation,
    aiConfidenceNotes: final.aiConfidenceNotes,
    dataLimitations: final.dataLimitations,
    uncertaintyLevel: final.uncertaintyLevel,
    recommendedAction: final.recommendedAction,
    generatedAt: new Date().toISOString(),
    usedFallback,
  };

  if (usedFallback.length === 0) resultCache.set(cacheKey, result);
  return result;
}
