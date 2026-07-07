// ── Orchestrator — Konsylium ─────────────────────────────────────────
// WAŻNE: to NIE jest chat z dziesięcioma ekspertami. To jest moduł
// DECYZYJNY — użytkownik ma dostać jeden protokół decyzyjny, nie dziesięć
// osobnych esejów do samodzielnego czytania. Dlatego pipeline ma dwa
// poziomy: dziesięciu ekspertów pracuje RÓWNOLEGLE i niezależnie (każdy
// zna tylko temat i research, nie widzi odpowiedzi pozostałych — inaczej
// dziewięciu eksperów po prostu powtarzałoby najgłośniejszą opinię), a
// synteza dostaje ich skondensowany digest i ma obowiązek wydać
// jednoznaczną rekomendację, nawet jeśli eksperci są podzieleni.
//
//   research    → reużywa buildFeed + extractPhrasesWithGemini (research.ts)
//   10 ekspertów ┐
//                │  RÓWNOLEGLE, niezależnie — Promise.all, ten sam wzorzec
//                │  co contextual/segments/opponents/media/rewrite w
//                ┘  lib/reaction-simulator/orchestrator.ts
//   synteza     → sekwencyjnie, po digest'cie z 10 opinii

import { getAIProvider, type AIProvider } from "@/lib/reaction-simulator/ai-provider";
import { CONSILIUM_EXPERTS, type ExpertProfile } from "./experts";
import { mockExpertOpinion, mockSynthesis } from "./mock-generators";
import { buildExpertPrompt, buildSynthesisPrompt } from "./prompts";
import { gatherResearchContext } from "./research";
import type { ConsiliumInput, ConsiliumResult, ExpertId, ExpertOpinion, StageEvent, StageId } from "./types";
import { extractJson, validateExpertOpinion, validateSynthesis } from "./validate";

function stageLabels(): Record<StageId, string> {
  const labels: Partial<Record<StageId, string>> = { research: "Research", synthesis: "Synteza Konsylium" };
  for (const e of CONSILIUM_EXPERTS) labels[e.id] = e.name;
  return labels as Record<StageId, string>;
}
const STAGE_LABELS = stageLabels();

// Digest opinii ekspertów wstrzykiwany do promptu syntezy — skondensowany,
// nie surowe dziesięć obiektów, dokładnie tak jak digestForFinal() w
// lib/reaction-simulator/orchestrator.ts robi to dla siedmiu etapów tam.
function digestForSynthesis(opinions: ExpertOpinion[]): string {
  return opinions
    .map((o) => {
      const lines = [
        `── ${o.expertName} (pewność: ${o.confidence}) ──`,
        `Stanowisko: ${o.headline}`,
        o.diagnosis && `Diagnoza: ${o.diagnosis}`,
        o.risks.length > 0 && `Ryzyka: ${o.risks.join("; ")}`,
        o.opportunities.length > 0 && `Szanse: ${o.opportunities.join("; ")}`,
        o.recommendations.length > 0 && `Rekomendacje: ${o.recommendations.join("; ")}`,
        o.strongestLine && `Najmocniejsze zdanie: „${o.strongestLine}"`,
        o.thingsNotToSay.length > 0 && `Czego nie mówić: ${o.thingsNotToSay.join("; ")}`,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");
}

export async function runConsilium(input: ConsiliumInput, onEvent: (e: StageEvent) => void): Promise<ConsiliumResult> {
  const provider: AIProvider = getAIProvider();
  const usedFallback: ExpertId[] = [];
  let synthesisUsedFallback = false;

  // ── Krok 1: Research (reużyty silnik wyszukiwania) ────────────────
  onEvent({ stage: "research", status: "analizuje", label: STAGE_LABELS.research });
  const researchContext = await gatherResearchContext(input);
  onEvent({
    stage: "research",
    status: researchContext.hasRealData ? "gotowe" : "fallback",
    label: STAGE_LABELS.research,
    data: researchContext,
    error: researchContext.hasRealData ? undefined : "Brak realnych materiałów o temacie w przeszukanym oknie — eksperci opierają się na kontekście podanym ręcznie i wiedzy ogólnej.",
  });

  // ── Krok 2: 10 ekspertów równolegle, niezależnie od siebie ────────
  for (const e of CONSILIUM_EXPERTS) onEvent({ stage: e.id, status: "analizuje", label: STAGE_LABELS[e.id] });

  async function runExpert(expert: ExpertProfile): Promise<ExpertOpinion> {
    const prompt = buildExpertPrompt(expert, input, researchContext);
    const raw = provider.isReal ? await provider.generateText(prompt, { maxTokens: 2200 }) : null;
    const parsed = extractJson(raw);
    const validated = parsed ? validateExpertOpinion(parsed, expert.id, expert.name) : null;
    if (validated) {
      onEvent({ stage: expert.id, status: "gotowe", label: STAGE_LABELS[expert.id] });
      return validated;
    }
    usedFallback.push(expert.id);
    const mocked = mockExpertOpinion(expert, input);
    onEvent({
      stage: expert.id,
      status: "fallback",
      label: STAGE_LABELS[expert.id],
      error: provider.isReal
        ? "Odpowiedź AI nie przeszła walidacji — użyto lokalnego fallbacku."
        : "Brak skonfigurowanego klucza AI — użyto lokalnego fallbacku.",
    });
    return mocked;
  }

  const expertOpinions = await Promise.all(CONSILIUM_EXPERTS.map(runExpert));

  // ── Krok 3: Synteza — sekwencyjnie, po digest'cie z 10 opinii ─────
  onEvent({ stage: "synthesis", status: "analizuje", label: STAGE_LABELS.synthesis });
  const opinionsDigest = digestForSynthesis(expertOpinions);
  const synthesisRaw = provider.isReal
    ? await provider.generateText(buildSynthesisPrompt(input, researchContext, opinionsDigest), { maxTokens: 3200 })
    : null;
  const synthesisParsed = extractJson(synthesisRaw);
  let synthesis = synthesisParsed ? validateSynthesis(synthesisParsed) : null;
  if (!synthesis) {
    synthesisUsedFallback = true;
    synthesis = mockSynthesis(input, expertOpinions);
    onEvent({
      stage: "synthesis",
      status: "fallback",
      label: STAGE_LABELS.synthesis,
      error: provider.isReal
        ? "Synteza AI nie przeszła walidacji (brak jednoznacznej decyzji w odpowiedzi) — użyto fallbacku lokalnego."
        : "Brak skonfigurowanego klucza AI — synteza to fallback lokalny.",
    });
  } else {
    onEvent({ stage: "synthesis", status: "gotowe", label: STAGE_LABELS.synthesis });
  }

  return {
    input,
    researchContext,
    expertOpinions,
    synthesis,
    createdAt: new Date().toISOString(),
    modelInfo: { provider: provider.name, isReal: provider.isReal },
    usedFallback,
    synthesisUsedFallback,
  };
}
