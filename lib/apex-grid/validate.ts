// ── Walidacja odpowiedzi AI — Apex Grid ────────────────────────────────
// Reużywa sprawdzone helpery z lib/reaction-simulator/validate.ts
// (extractJson/isRecord/str/arr/clampNum) — ten sam wzorzec co
// lib/consilium/validate.ts. Ten plik dokłada tylko kształty specyficzne
// dla Apex Grid: Scenario[] (warstwa 4) i DecisionPackage (warstwa 5).
// Walidacja jest ODRZUCAJĄCA: niepełna/pusta odpowiedź AI daje null,
// a orchestrator podstawia deterministyczny mock (mock-generators.ts) —
// moduł nigdy nie pokazuje użytkownikowi na wpół wypełnionej struktury.

import { arr, clampNum, extractJson, isRecord, str } from "@/lib/reaction-simulator/validate";
import type {
  ConsequenceMap,
  CounterPlay,
  DecisionPackage,
  DecisionPriority,
  Scenario,
  ScenarioTimeline,
} from "./types";

export { extractJson, isRecord, str, arr, clampNum };

const VALID_PRIORITY: DecisionPriority[] = ["low", "medium", "high", "urgent"];

function strArr(v: unknown): string[] {
  return arr<string>(v).filter((x) => typeof x === "string" && x.trim().length > 0);
}

function validateTimeline(data: unknown): ScenarioTimeline {
  const d = isRecord(data) ? data : {};
  return { h48: str(d.h48), d7: str(d.d7), d30: str(d.d30) };
}

function validateScenario(data: unknown, index: number): Scenario | null {
  if (!isRecord(data)) return null;
  const label = str(data.label);
  const summary = str(data.summary);
  if (!label || !summary) return null;
  return {
    id: str(data.id) || String.fromCharCode(65 + index), // A, B, C…
    label,
    summary,
    opponentsReaction: str(data.opponentsReaction),
    mediaReaction: str(data.mediaReaction),
    ownBaseReaction: str(data.ownBaseReaction),
    timeline: validateTimeline(data.timeline),
    riskScore: clampNum(data.riskScore),
    gainScore: clampNum(data.gainScore),
    keyRisk: str(data.keyRisk),
    keyGain: str(data.keyGain),
  };
}

export function validateScenarios(data: unknown): Scenario[] | null {
  if (!isRecord(data)) return null;
  const rawList = arr<unknown>(data.scenarios);
  const scenarios = rawList
    .map((s, i) => validateScenario(s, i))
    .filter((s): s is Scenario => s !== null);
  // Minimum sensu: co najmniej dwa warianty (jeden "aktywny" + bezczynność) —
  // pojedynczy scenariusz to nie jest wybór, orchestrator ma dać fallback.
  if (scenarios.length < 2) return null;
  return scenarios;
}

function validateConsequenceMap(data: unknown): ConsequenceMap {
  const d = isRecord(data) ? data : {};
  return {
    political: strArr(d.political),
    media: strArr(d.media),
    social: strArr(d.social),
    internet: strArr(d.internet),
  };
}

function validateCounterPlays(data: unknown): CounterPlay[] {
  return arr<unknown>(data)
    .map((c) => {
      if (!isRecord(c)) return null;
      const expectedAttack = str(c.expectedAttack);
      const response = str(c.response);
      if (!expectedAttack || !response) return null;
      return { expectedAttack, response };
    })
    .filter((c): c is CounterPlay => c !== null);
}

export function validateDecision(data: unknown, validScenarioIds: string[]): DecisionPackage | null {
  if (!isRecord(data)) return null;
  const decision = str(data.decision);
  const rationale = str(data.rationale);
  if (!decision || !rationale) return null; // bez decyzji i uzasadnienia pakiet nie istnieje

  const rawChosen = str(data.chosenScenarioId);
  const chosenScenarioId = validScenarioIds.includes(rawChosen) ? rawChosen : (validScenarioIds[0] ?? "A");

  return {
    caseTitle: str(data.caseTitle) || "Sprawa bez tytułu",
    decision,
    chosenScenarioId,
    rationale,
    priority: (VALID_PRIORITY.includes(data.priority as DecisionPriority) ? data.priority : "medium") as DecisionPriority,
    consequenceMap: validateConsequenceMap(data.consequenceMap),
    messageLines: strArr(data.messageLines),
    thingsNotToSay: strArr(data.thingsNotToSay),
    counterPlays: validateCounterPlays(data.counterPlays),
    planB: str(data.planB),
    whatWeKnow: strArr(data.whatWeKnow),
    whatWeAssume: strArr(data.whatWeAssume),
    whatToVerify: strArr(data.whatToVerify),
  };
}
