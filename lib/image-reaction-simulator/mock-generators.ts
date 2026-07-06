// ── Fallback generators ────────────────────────────────────────────────
// Ten sam princip co lib/reaction-simulator/mock-generators.ts: uruchamiane
// WYŁĄCZNIE gdy brak GEMINI_API_KEY, wywołanie AI padnie, albo odpowiedź
// nie przejdzie walidacji kształtu (validate.ts). Raport nigdy nie jest
// pusty ani nie wywala aplikacji — fallback jest zawsze jawnie oznaczony
// w UI jako "użyto fallbacku", nigdy cichy.

import { ALL_ATTACK_VECTORS, ALL_CAPTION_TYPES, ALL_VISUAL_RISK_FACTORS, EVOLUTION_WINDOWS, IMAGE_AUDIENCE_SEGMENTS, VISUAL_RISK_FACTOR_LABELS } from "./mock-data";
import type { PrecedentCandidate } from "./visual-precedents";
import type {
  CaptionStageData, FinalStageData, MemeStageData, RiskStageData,
} from "./validate";
import type {
  ImageEvolutionStage, ImageLocalScanResult, ImageObservation, MediaImageFrame,
  OpponentImageAttack, SegmentImageReaction, VisualPrecedentMatch,
} from "./types";

export function mockObservation(scan: ImageLocalScanResult): ImageObservation {
  return {
    mainSubject: "nieokreślony (fallback lokalny)",
    peopleCount: 1,
    scene: "Fallback: brak połączenia z modelem Vision AI.",
    facialExpression: "brak danych",
    pose: "brak danych",
    gesture: "brak danych",
    background: "brak danych",
    props: [],
    composition: `kadr ${scan.aspectRatioLabel}, ${scan.megapixels}MP`,
    spatialRelations: "brak danych",
    emotion: "brak danych",
    lightingQuality: "brak danych",
    looksNatural: true,
    looksStaged: false,
    notableRiskyElements: [],
    rawDescription: "Analiza wizualna niedostępna — model Vision AI nie odpowiedział. Poniższe kroki opierają się wyłącznie na lokalnym skanie technicznym.",
  };
}

export function mockRisk(): RiskStageData {
  return {
    visualRiskFactors: ALL_VISUAL_RISK_FACTORS.map((factor) => ({
      factor, label: VISUAL_RISK_FACTOR_LABELS[factor], score: 50,
      reason: "Fallback: brak połączenia z modelem AI — nie oceniono tego czynnika.",
    })),
    riskHotspots: [],
  };
}

export function mockMeme(): MemeStageData {
  return {
    memePotential: {
      isMemeable: false, score: 30, mostMemeableElement: "Fallback: analiza niepełna.",
      possibleCaptions: [], tones: [], viralPotential: "niski", canMainstream: false,
      defenseAdvice: "Uruchom ponownie pełną analizę AI przed publikacją.", canCaptionDisarm: false,
    },
    memeScenarios: [],
  };
}

// Fallback dla silnika precedensów wizualnych — świadomie zwraca co
// najwyżej jednego kandydata z lokalnego dopasowania (bez LLM), jasno
// oznaczonego jako fallback, zamiast fabrykować dopasowanie. Pusta
// tablica jest tu równie poprawnym wynikiem co w ścieżce normalnej.
export function mockHistoricalPrecedent(candidates: PrecedentCandidate[]): VisualPrecedentMatch[] {
  const best = candidates.filter((c) => c.localMatchStrength > 0).slice(0, 1);
  return best.map((c) => ({
    archetypeId: c.archetypeId,
    label: c.label,
    matchStrength: c.localMatchStrength,
    whySimilar: "Fallback: brak połączenia z modelem AI — to wyłącznie lokalne dopasowanie słów kluczowych, nie ocena LLM konkretnego zdjęcia.",
    typicalPattern: c.typicalPattern,
    typicalOutcome: c.typicalOutcome,
    historicalNote: "Wzorzec ogólny, niepotwierdzony przez pełną analizę AI w tym uruchomieniu.",
  }));
}

export function mockSegments(): SegmentImageReaction[] {
  return IMAGE_AUDIENCE_SEGMENTS.map((segment) => ({
    segment, emotion: "brak danych", interpretation: "Fallback: analiza niepełna.",
    acceptance: 50, risk: 50, likelyComment: "Fallback: brak połączenia z modelem AI.",
    strengthensOrWeakens: "neutralne" as const, improvementTip: "Uruchom ponownie tę analizę.",
  }));
}

export function mockOpponents(): OpponentImageAttack[] {
  return ALL_ATTACK_VECTORS.map((vector) => ({
    vector, from: `środowisko określane jako ${vector}`,
    attack: "Fallback: brak połączenia z modelem AI — nie wygenerowano linii ataku dla tego wektora.",
    severity: 50,
  }));
}

const MEDIA_CATS: MediaImageFrame["category"][] = ["przychylne", "wrogie", "neutralne", "tabloidy", "lokalne", "tv_informacyjne", "fact_checkerzy", "konta_x"];

export function mockMedia(): MediaImageFrame[] {
  return MEDIA_CATS.map((category) => ({
    category, agencyCaption: "Fallback: analiza niepełna.", portalHeadline: "Fallback: analiza niepełna.",
    tvChyron: "—", lead: "—", columnistComment: "—", negativeUseRisk: "srednie" as const,
    illustratesBiggerNarrative: false,
  }));
}

export function mockCaption(): CaptionStageData {
  return {
    captionRecommendations: ALL_CAPTION_TYPES.map((type) => ({
      type, label: type, text: "Fallback: brak połączenia z modelem AI — nie wygenerowano podpisu.",
      risk: 50, tone: "brak danych", strengthensImage: false, disarmsRisk: false, mayCreateNewProblem: false,
    })),
    captionRisks: [],
  };
}

export function mockEvolution(scan: ImageLocalScanResult): ImageEvolutionStage[] {
  return EVOLUTION_WINDOWS.map((w, i) => ({
    window: w.window, label: w.label,
    whatMayHappen: "Fallback: brak połączenia z modelem AI dla tego etapu.",
    whoAmplifies: "—", likelyComment: "—", howToReact: "—", whatNotToDo: "—",
    intensity: Math.max(10, 60 - i * 8 + (scan.isHighRes ? 0 : 10)),
  }));
}

export function mockFinal(scan: ImageLocalScanResult): FinalStageData {
  return {
    verdict: "wysokie_ryzyko",
    summary: "Pełna analiza AI niedostępna — poniższy wynik opiera się wyłącznie na lokalnym skanie technicznym.",
    recommendedAction: "Skonfiguruj GEMINI_API_KEY albo spróbuj ponownie przed podjęciem decyzji o publikacji.",
    overallScores: {
      authenticity: 50, empathy: 50, agency: 50, strengthAuthority: 50, closenessToPeople: 50,
      memeRisk: 50, arroganceRisk: 50, artificialityRisk: 50, outOfContextRisk: 50,
      viralPotential: 50, centerCost: 50, ownBaseGain: 50, channelFit: 50,
    },
    cropRecommendations: [],
    alternativeUseRecommendations: [],
    strategicRecommendation: {
      channel: "—", caption: "—", crop: "—", needsRetouch: false, needsDifferentImage: false,
      needsSeries: false, needsTextualCover: false,
      biggestVisualProblem: "Nie oceniono — brak połączenia z modelem AI.",
      biggestVisualAsset: "Nie oceniono — brak połączenia z modelem AI.",
      firstCounterAttack: "—",
    },
    uncertaintyLevel: "wysoka",
    aiConfidenceNotes: "Model Vision AI był niedostępny albo zwrócił nieprawidłową odpowiedź. Wynik pochodzi wyłącznie z lokalnego, deterministycznego skanu technicznego (format/rozdzielczość/proporcje), nie z pełnej analizy AI.",
    dataLimitations: [
      "Brak realnej analizy Vision AI w tym uruchomieniu (fallback).",
      "Brak danych z monitoringu social media, sondaży i realnego zasięgu — zdjęcie jeszcze nie zostało opublikowane.",
      "Brak dostępu do archiwum historycznych analogii wizualnych (planowane, niewdrożone).",
    ],
  };
}
