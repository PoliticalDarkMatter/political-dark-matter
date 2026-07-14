// ── Orchestrator — Apex Grid ───────────────────────────────────────────
// Pipeline pięciu warstw (spec: Apex_Grid_plan_modulu.docx):
//
//   Sygnał (Narrative Scope)  ┐ RÓWNOLEGLE — obie warstwy są niezależne
//   Grunt  (e-Wyborcy)     ┘ (Promise.all)
//   Narada (e-Konsylium)        → eksperci RÓWNOLEGLE (skład per produkt)
//   Scenariusze               → sekwencyjnie, na digest'cie warstw 1-3
//   Decyzja                   → sekwencyjnie, na digest'cie warstw 1-4
//
// Ten sam wzorzec zdarzeń NDJSON co lib/consilium/orchestrator.ts.
// WAŻNE dla przyszłych modyfikacji: warstwy mieszkają w osobnych plikach
// (signal.ts / ground.ts / council.ts), a ich strojenie per produkt w
// products.ts — zmiana zachowania jednej warstwy nie dotyka pozostałych.

import { getAIProvider, type AIProvider } from "@/lib/reaction-simulator/ai-provider";
import { gatherGround } from "./ground";
import { runCouncil } from "./council";
import { mockDecision, mockScenarios } from "./mock-generators";
import { buildDecisionPrompt, buildScenariosPrompt } from "./prompts";
import { gatherSignal } from "./signal";
import type { ApexInput, ApexResult, ApexStageEvent, Scenario } from "./types";
import { extractJson, validateDecision, validateScenarios } from "./validate";

const LABELS = {
  signal: "Sygnał (Narrative Scope)",
  ground: "Grunt (e-Wyborcy)",
  council: "Narada (e-Konsylium)",
  scenarios: "Scenariusze",
  decision: "Decyzja",
} as const;

export async function runApexGrid(input: ApexInput, onEvent: (e: ApexStageEvent) => void): Promise<ApexResult> {
  const provider: AIProvider = getAIProvider();

  // ── Warstwy 1-2: Sygnał + Grunt, równolegle ──────────────────────────
  onEvent({ stage: "signal", status: "analizuje", label: LABELS.signal });
  onEvent({ stage: "ground", status: "analizuje", label: LABELS.ground });

  const [signal, ground] = await Promise.all([gatherSignal(input), gatherGround(input)]);

  onEvent({
    stage: "signal",
    status: signal.hasRealData ? "gotowe" : "fallback",
    label: LABELS.signal,
    data: { totalFound: signal.totalFound },
    error: signal.hasRealData ? undefined : "Brak materiałów w monitoringu — dalsze warstwy pracują bez sygnału medialnego i mają to jawnie zaznaczać.",
  });
  onEvent({
    stage: "ground",
    status: ground.hasData ? "gotowe" : "fallback",
    label: LABELS.ground,
    data: { syntheses: ground.syntheses.length, findings: ground.findings.length },
    error: ground.hasData ? undefined : "Brak dopasowanych badań w e-Wyborcy — reakcje grup będą hipotezami, nie danymi.",
  });

  // ── Warstwa 3: Narada (eksperci równolegle) ──────────────────────────
  onEvent({ stage: "council", status: "analizuje", label: LABELS.council, data: { done: 0, total: 0 } });
  const council = await runCouncil(input, signal, ground, provider, (done, total) => {
    onEvent({ stage: "council", status: "analizuje", label: LABELS.council, data: { done, total } });
  });
  onEvent({
    stage: "council",
    status: council.usedFallback.length === 0 ? "gotowe" : "fallback",
    label: LABELS.council,
    data: { done: council.opinions.length, total: council.opinions.length },
    error:
      council.usedFallback.length === 0
        ? undefined
        : `Część głosów narady (${council.usedFallback.length}) to fallback lokalny — brak klucza AI albo odpowiedź nie przeszła walidacji.`,
  });

  // ── Warstwa 4: Scenariusze — sekwencyjnie ────────────────────────────
  onEvent({ stage: "scenarios", status: "analizuje", label: LABELS.scenarios });
  let scenariosUsedFallback = false;
  const scenariosRaw = provider.isReal
    ? await provider.generateText(buildScenariosPrompt(input, signal, ground, council), { maxTokens: 3200 })
    : null;
  let scenarios: Scenario[] | null = validateScenarios(extractJson(scenariosRaw));
  if (!scenarios) {
    scenariosUsedFallback = true;
    scenarios = mockScenarios(input);
    onEvent({
      stage: "scenarios",
      status: "fallback",
      label: LABELS.scenarios,
      error: provider.isReal
        ? "Odpowiedź AI dla scenariuszy nie przeszła walidacji — użyto szkieletu lokalnego."
        : "Brak skonfigurowanego klucza AI — scenariusze to szkielet lokalny.",
    });
  } else {
    onEvent({ stage: "scenarios", status: "gotowe", label: LABELS.scenarios, data: { count: scenarios.length } });
  }

  // ── Warstwa 5: Decyzja — sekwencyjnie, widzi wszystko ────────────────
  onEvent({ stage: "decision", status: "analizuje", label: LABELS.decision });
  let decisionUsedFallback = false;
  const decisionRaw = provider.isReal
    ? await provider.generateText(buildDecisionPrompt(input, signal, ground, council, scenarios), { maxTokens: 3600 })
    : null;
  let decision = validateDecision(
    extractJson(decisionRaw),
    scenarios.map((s) => s.id)
  );
  if (!decision) {
    decisionUsedFallback = true;
    decision = mockDecision(input, scenarios);
    onEvent({
      stage: "decision",
      status: "fallback",
      label: LABELS.decision,
      error: provider.isReal
        ? "Odpowiedź AI dla decyzji nie przeszła walidacji (brak jednoznacznej decyzji) — użyto szkieletu lokalnego."
        : "Brak skonfigurowanego klucza AI — pakiet decyzyjny to szkielet lokalny.",
    });
  } else {
    onEvent({ stage: "decision", status: "gotowe", label: LABELS.decision });
  }

  return {
    input,
    signal,
    ground,
    council,
    scenarios,
    decision,
    createdAt: new Date().toISOString(),
    modelInfo: { provider: provider.name, isReal: provider.isReal },
    scenariosUsedFallback,
    decisionUsedFallback,
  };
}
