// ── Fallback generators ────────────────────────────────────────────────
// Uruchamiane WYŁĄCZNIE gdy: (a) brak GEMINI_API_KEY, (b) wywołanie LLM
// padnie, albo (c) odpowiedź nie przejdzie walidacji kształtu (validate.ts).
// Cel: raport nigdy nie jest pusty ani nie wywala aplikacji, ale wynik
// fallbacku jest zawsze jawnie oznaczony w UI jako "użyto fallbacku" —
// zasada „nie mieszać tekstów AI z logiką aplikacji" i „oznaczać
// niepełną analizę" ze specyfikacji. To NIE jest druga ścieżka
// „ozdobnych mocków" — to siatka bezpieczeństwa z tej samej struktury
// danych, wypełniona z lokalnego skanu zamiast z modelu językowego.

import { AUDIENCE_SEGMENTS } from "./mock-data";
import type {
  ContextualStageData, MediaStageData, RewriteStageData, FinalStageData,
} from "./validate";
import type { LocalScanResult, OpponentAttack, SegmentReaction, SimulationInput } from "./types";

export function mockContextual(input: SimulationInput, scan: LocalScanResult): ContextualStageData {
  const triggerPhrases = scan.triggerMatches.slice(0, 4).map((m) => ({
    phrase: m.phrase,
    why: m.reason,
    whoWillAttack: "przeciwnicy polityczni i komentatorzy nieprzychylnych mediów",
    howClipped: `wyrwane z kontekstu jako samodzielny cytat: "${m.phrase}"`,
    alternative: "sformułowanie bez tego słowa, z konkretem zamiast oceny",
    action: "przeramować" as const,
    severity: Math.min(100, m.weight * 4),
  }));
  return {
    triggerPhrases,
    redFlags: scan.likelyCrisisArchetype
      ? [{ type: scan.likelyCrisisArchetype, description: "Wzorzec wykryty lokalnie na podstawie słownika fraz zapalnych — wymaga potwierdzenia przez pełną analizę AI.", severity: scan.baseRiskScore }]
      : [{ type: "brak wyraźnego wzorca", description: "Lokalny skan nie dopasował znanego archetypu kryzysu.", severity: 20 }],
    worstCaseInterpretation: {
      outOfContextQuote: scan.triggerMatches[0]?.phrase ?? "(brak wyraźnego kandydata — potrzebna pełna analiza AI)",
      opponentTweet: "Fallback: brak połączenia z modelem AI — nie wygenerowano hipotetycznego tweeta.",
      tvChyron: "Fallback: analiza niepełna.",
      portalHeadline: "Fallback: analiza niepełna.",
      journalistQuestion: "Fallback: analiza niepełna.",
      factCheckClaim: "Fallback: analiza niepełna.",
      disappointedVoterComment: "Fallback: analiza niepełna.",
      memeSummary: "Fallback: analiza niepełna.",
    },
  };
}

export function mockSegments(scan: LocalScanResult): SegmentReaction[] {
  // Skala oparta o baseRiskScore z lokalnego skanu — nie losowa, ale
  // wyraźnie uboższa niż realna analiza LLM per-segment.
  return AUDIENCE_SEGMENTS.map((segment) => ({
    segment,
    emotion: scan.baseRiskScore > 50 ? "niepewność" : "obojętność",
    acceptance: Math.max(10, 60 - Math.round(scan.baseRiskScore / 2)),
    outrage: Math.min(90, Math.round(scan.baseRiskScore / 1.5)),
    engagementLikelihood: 40,
    sampleComment: "Fallback: brak połączenia z modelem AI — brak wygenerowanego przykładowego komentarza dla tego segmentu.",
    mainArgument: "Analiza niepełna — uruchom ponownie ten etap.",
    uncertainty: "wysoka" as const,
  }));
}

const OPPONENT_VECTORS: OpponentAttack["vector"][] = ["lewica", "prawica", "liberalny", "populistyczny", "ekspercki", "personalny", "memiczny"];

export function mockOpponents(scan: LocalScanResult): OpponentAttack[] {
  return OPPONENT_VECTORS.map((vector) => ({
    vector,
    from: `środowisko określane jako ${vector}`,
    attack: "Fallback: brak połączenia z modelem AI — nie wygenerowano konkretnej linii ataku dla tego wektora.",
    severity: scan.baseRiskScore,
  }));
}

const MEDIA_CATS: MediaStageData["mediaFrames"][number]["category"][] = [
  "przychylne", "wrogie", "neutralne", "tabloidy", "lokalne", "tv_informacyjne", "fact_checkerzy", "konta_x",
];

const TIMELINE_TEMPLATE: Array<{ label: string; window: string }> = [
  { label: "Publikacja / wypowiedź", window: "0–1h" },
  { label: "Pierwsze konta polityczne", window: "1–3h" },
  { label: "Dziennikarze i komentatorzy", window: "3–8h" },
  { label: "Portale", window: "8–24h" },
  { label: "Telewizja", window: "24–48h" },
  { label: "Memy / TikTok", window: "24–48h" },
  { label: "Reakcja przeciwnika", window: "48h+" },
  { label: "Doprecyzowanie / przeprosiny / kontratak", window: "48h+" },
];

export function mockMedia(scan: LocalScanResult): MediaStageData {
  return {
    mediaFrames: MEDIA_CATS.map((category) => ({
      category,
      likelyHeadline: "Fallback: analiza niepełna.",
      extractedQuote: scan.triggerMatches[0]?.phrase ?? "—",
      frame: scan.likelyCrisisArchetype ?? "brak jednoznacznej ramy",
      riskLevel: scan.riskBand === "bardzo_wysokie" || scan.riskBand === "wysokie" ? "wysokie" : "srednie",
      lifespan: "24h",
    })),
    escalationTimeline: TIMELINE_TEMPLATE.map((t, i) => ({
      stage: i + 1,
      label: t.label,
      window: t.window,
      whatHappens: "Fallback: brak połączenia z modelem AI dla tego etapu.",
      whoAmplifies: "—",
      counterMeasure: "—",
      intensity: Math.max(10, scan.baseRiskScore - i * 8),
    })),
  };
}

export function mockRewrite(input: SimulationInput): RewriteStageData {
  const types: RewriteStageData["counterfactualVariants"][number]["type"][] = ["bezpieczna", "empatyczna", "ofensywna", "technokratyczna", "social"];
  const labels: Record<string, string> = {
    bezpieczna: "Wersja bezpieczna", empatyczna: "Wersja empatyczna", ofensywna: "Wersja ofensywna",
    technokratyczna: "Wersja technokratyczna", social: "Wersja pod social media",
  };
  return {
    counterfactualVariants: types.map((type) => ({
      type,
      label: labels[type],
      text: "Fallback: brak połączenia z modelem AI — nie wygenerowano wariantu. Oryginalny tekst: " + input.text.slice(0, 140),
      scores: { attackRisk: 50, clarity: 50, mobilizationPotential: 50, mediaPotential: 50, memeRisk: 50, goalFit: 50 },
    })),
    recommendedVariantType: "bezpieczna",
  };
}

export function mockFinal(scan: LocalScanResult): FinalStageData {
  const highRisk = scan.riskBand === "wysokie" || scan.riskBand === "bardzo_wysokie";
  return {
    verdict: highRisk ? "wysokie_ryzyko" : "publikowac_po_poprawkach",
    summary: "Pełna analiza AI niedostępna — poniższy wynik opiera się wyłącznie na lokalnym, deterministycznym skanie ryzyka.",
    overallScores: {
      mobilizationPotential: 40, crisisRisk: scan.baseRiskScore, outOfContextVulnerability: scan.baseRiskScore,
      clarity: 50, memeRisk: 40, mediaPotential: 50, centerCost: scan.baseRiskScore, ownBaseGain: 40,
    },
    strategicRecommendation: {
      action: "fakty",
      whatToDo: "Uruchom ponownie pełną analizę AI (skonfiguruj GEMINI_API_KEY albo spróbuj ponownie) przed podjęciem decyzji.",
      whatToAvoid: "Nie podejmuj decyzji wyłącznie na podstawie tego uproszczonego wyniku.",
      mustSaySentence: "—",
      killerSentence: scan.triggerMatches[0]?.phrase ?? "brak",
      saverSentence: "—",
      firstCounterResponse: "—",
      backupStatement: "—",
      whatToMonitor: ["ponowne uruchomienie pełnej analizy AI"],
      whenToReactAgain: "—",
    },
    silenceTest: {
      isResponseNeeded: true, wouldResponseAmplify: false, isSilenceSafer: false,
      whenToReturn: "—", recommendedChannel: "rzecznik",
      reasoning: "Brak danych z pełnej analizy AI — nie da się ocenić.",
    },
    uncertaintyLevel: "wysoka",
    aiConfidenceNotes: "Model językowy był niedostępny albo zwrócił nieprawidłową odpowiedź. Wynik pochodzi z lokalnego, deterministycznego skanu ryzyka (słownik fraz zapalnych + reguły kontekstowe), nie z pełnej analizy AI.",
    dataLimitations: [
      "Brak realnej analizy LLM w tym uruchomieniu (fallback).",
      "Brak danych z monitoringu social media, sondaży i realnego zasięgu — tekst jeszcze nie został opublikowany.",
      "Brak dostępu do archiwum historycznych przypadków (Narrative Memory) — funkcja planowana, nie wdrożona.",
    ],
  };
}
