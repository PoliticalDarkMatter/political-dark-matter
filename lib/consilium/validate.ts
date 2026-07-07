// ── Walidacja odpowiedzi AI — Konsylium ────────────────────────────────
// Reużywa istniejące, sprawdzone helpery z lib/reaction-simulator/validate.ts
// (extractJson/isRecord/str/arr) zamiast pisać je od nowa — dokładnie
// zgodnie z instrukcją "użyj istniejącego mechanizmu walidacji". Ten plik
// dokłada tylko kształty specyficzne dla Konsylium (ExpertOpinion,
// ConsiliumSynthesis).

import { arr, extractJson, isRecord, str } from "@/lib/reaction-simulator/validate";
import type { ConfidenceLevel, ExpertId, ExpertOpinion, ResearchNotes, RiskMap, SynthesisPriority } from "./types";

export { extractJson, isRecord, str, arr };

const VALID_CONFIDENCE: ConfidenceLevel[] = ["low", "medium", "high"];
const VALID_PRIORITY: SynthesisPriority[] = ["low", "medium", "high", "urgent"];

function validateResearchNotes(data: unknown): ResearchNotes {
  if (!isRecord(data)) return { usedSources: [], missingSources: [], verificationNeeded: [] };
  return {
    usedSources: arr<string>(data.usedSources).filter((x) => typeof x === "string"),
    missingSources: arr<string>(data.missingSources).filter((x) => typeof x === "string"),
    verificationNeeded: arr<string>(data.verificationNeeded).filter((x) => typeof x === "string"),
  };
}

export function validateExpertOpinion(data: unknown, expertId: ExpertId, expertName: string): ExpertOpinion | null {
  if (!isRecord(data)) return null;
  const headline = str(data.headline);
  const diagnosis = str(data.diagnosis);
  if (!headline && !diagnosis) return null; // pusty/nieprzydatny wynik — orchestrator ma podstawić mock

  return {
    expertId,
    expertName,
    headline: headline || "Brak jednoznacznego stanowiska.",
    diagnosis: diagnosis || "Analiza niepełna — potraktuj jako wstępny sygnał.",
    keyFindings: arr<string>(data.keyFindings).filter((x) => typeof x === "string"),
    opportunities: arr<string>(data.opportunities).filter((x) => typeof x === "string"),
    risks: arr<string>(data.risks).filter((x) => typeof x === "string"),
    recommendations: arr<string>(data.recommendations).filter((x) => typeof x === "string"),
    strongestLine: str(data.strongestLine),
    thingsNotToSay: arr<string>(data.thingsNotToSay).filter((x) => typeof x === "string"),
    openQuestions: arr<string>(data.openQuestions).filter((x) => typeof x === "string"),
    confidence: (VALID_CONFIDENCE.includes(data.confidence as ConfidenceLevel) ? data.confidence : "medium") as ConfidenceLevel,
    researchNotes: validateResearchNotes(data.researchNotes),
  };
}

function validateRiskMap(data: unknown): RiskMap {
  const d = isRecord(data) ? data : {};
  const pick = (k: string) => arr<string>(d[k]).filter((x) => typeof x === "string");
  return {
    political: pick("political"),
    legal: pick("legal"),
    media: pick("media"),
    social: pick("social"),
    economic: pick("economic"),
    internet: pick("internet"),
    reputational: pick("reputational"),
  };
}

export interface SynthesisStageData {
  caseTitle: string;
  coreDiagnosis: string;
  keyFindings: string[];
  consensusProtocol: string[];
  disagreementProtocol: string[];
  riskMap: RiskMap;
  opportunityMap: string[];
  finalRecommendation: { decision: string; rationale: string; priority: SynthesisPriority };
  messageLines: string[];
  thingsNotToSay: string[];
  verificationChecklist: string[];
}

export function validateSynthesis(data: unknown): SynthesisStageData | null {
  if (!isRecord(data)) return null;
  const fr = isRecord(data.finalRecommendation) ? data.finalRecommendation : null;
  const decision = fr ? str(fr.decision) : "";
  if (!decision) return null; // brak jednoznacznej decyzji => cały wynik traktujemy jako niewalidny, żeby nie pokazać pustki tam gdzie ma być sedno modułu

  return {
    caseTitle: str(data.caseTitle, "Analiza tematu"),
    coreDiagnosis: str(data.coreDiagnosis),
    keyFindings: arr<string>(data.keyFindings).filter((x) => typeof x === "string"),
    consensusProtocol: arr<string>(data.consensusProtocol).filter((x) => typeof x === "string"),
    disagreementProtocol: arr<string>(data.disagreementProtocol).filter((x) => typeof x === "string"),
    riskMap: validateRiskMap(data.riskMap),
    opportunityMap: arr<string>(data.opportunityMap).filter((x) => typeof x === "string"),
    finalRecommendation: {
      decision,
      rationale: str(fr!.rationale),
      priority: (VALID_PRIORITY.includes(fr!.priority as SynthesisPriority) ? fr!.priority : "medium") as SynthesisPriority,
    },
    messageLines: arr<string>(data.messageLines).filter((x) => typeof x === "string"),
    thingsNotToSay: arr<string>(data.thingsNotToSay).filter((x) => typeof x === "string"),
    verificationChecklist: arr<string>(data.verificationChecklist).filter((x) => typeof x === "string"),
  };
}
