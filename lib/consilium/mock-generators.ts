// ── Fallback lokalny (bez AI) — Konsylium ──────────────────────────────
// Ten sam wzorzec co lib/reaction-simulator/mock-generators.ts: gdy provider
// nie jest realny albo odpowiedź nie przejdzie walidacji, orchestrator
// podstawia w to miejsce w pełni wypełnioną (nie pustą) strukturę danych,
// oznaczając etap jako "fallback". Mock korzysta z profilu eksperta
// (experts.ts), żeby wynik był specyficzny dla danej roli, a nie
// identyczny placeholder powielony dziesięć razy.

import type { ExpertProfile } from "./experts";
import type { ConsiliumInput, ExpertOpinion } from "./types";
import type { SynthesisStageData } from "./validate";

export function mockExpertOpinion(expert: ExpertProfile, input: ConsiliumInput): ExpertOpinion {
  return {
    expertId: expert.id,
    expertName: expert.name,
    headline: `Brak realnej odpowiedzi AI — poniżej szkielet analizy z perspektywy: ${expert.perspective.toLowerCase()}`,
    diagnosis: `Nie udało się wygenerować pełnej analizy tematu „${input.topic.slice(0, 120)}" z perspektywy roli „${expert.name}". Poniższe punkty to standardowe pytania kontrolne tej roli — wymagają realnej analizy AI lub ręcznego uzupełnienia przed użyciem.`,
    keyFindings: [`Ekspert nie zwrócił realnej analizy — sprawdź konfigurację klucza AI (GEMINI_API_KEY).`],
    opportunities: [],
    risks: [`Bez działającego providera AI ta perspektywa (${expert.specialization.toLowerCase()}) nie została realnie sprawdzona.`],
    recommendations: [`Uruchom analizę ponownie z aktywnym providerem AI, zanim rekomendacje tego eksperta zostaną użyte operacyjnie.`],
    strongestLine: "",
    thingsNotToSay: [],
    openQuestions: expert.keyQuestions,
    confidence: "low",
    researchNotes: {
      usedSources: [],
      missingSources: ["Cała analiza AI dla tej roli."],
      verificationNeeded: ["Ponowne uruchomienie Konsylium z działającym providerem AI."],
    },
  };
}

export function mockSynthesis(input: ConsiliumInput, opinions: ExpertOpinion[]): SynthesisStageData {
  const realOpinions = opinions.filter((o) => o.confidence !== "low" || o.diagnosis.length > 0);
  const allRisks = opinions.flatMap((o) => o.risks);
  const allRecommendations = opinions.flatMap((o) => o.recommendations);

  return {
    caseTitle: input.topic.slice(0, 80) || "Analiza tematu",
    coreDiagnosis:
      "Synteza nie została w pełni wygenerowana przez AI (brak realnej odpowiedzi lub błąd walidacji). Poniższy protokół jest szkieletem złożonym z surowych ustaleń poszczególnych ekspertów — traktuj go jako punkt wyjścia do ręcznej analizy, nie jako gotową rekomendację.",
    keyFindings: allRisks.slice(0, 8),
    consensusProtocol: [],
    disagreementProtocol: [],
    riskMap: {
      political: [],
      legal: [],
      media: [],
      social: [],
      economic: [],
      internet: [],
      reputational: allRisks.slice(0, 5),
    },
    opportunityMap: opinions.flatMap((o) => o.opportunities).slice(0, 5),
    finalRecommendation: {
      decision: "Nie podejmować decyzji na podstawie tej analizy — uruchom Konsylium ponownie z działającym providerem AI.",
      rationale: `Synteza jest fallbackiem lokalnym (${realOpinions.length}/${opinions.length} ekspertów zwróciło realną analizę). Rekomendacja końcowa wymaga realnej syntezy AI, nie mechanicznego złożenia surowych ustaleń.`,
      priority: "medium",
    },
    messageLines: [],
    thingsNotToSay: opinions.flatMap((o) => o.thingsNotToSay).slice(0, 5),
    verificationChecklist: [
      "Sprawdź, czy zmienna środowiskowa GEMINI_API_KEY jest ustawiona i aktualna.",
      "Uruchom Konsylium ponownie po naprawie konfiguracji providera AI.",
      ...allRecommendations.slice(0, 3),
    ],
  };
}
