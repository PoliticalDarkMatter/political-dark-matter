// ── Walidacja odpowiedzi AI ────────────────────────────────────────────
// Zasada: model językowy nigdy nie trafia bezpośrednio do UI. Każda
// odpowiedź przechodzi przez ekstrakcję JSON-a i sanity-check kształtu.
// Brak / zły kształt => zwracamy null, a orchestrator.ts w tym miejscu
// podstawia wynik z mock-generators.ts i oznacza etap jako "fallback"
// (nigdy nie wywala całego raportu z powodu jednego złego etapu).

export function extractJson(raw: string | null): unknown | null {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function clampNum(v: unknown, fallback = 50): number {
  const n = typeof v === "number" ? v : Number(v);
  if (Number.isNaN(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

export function arr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

import type {
  EscalationStage, MediaFrame, OpponentAttack, RedFlag, SegmentReaction,
  SilenceTest, StrategicRecommendation, TriggerPhraseAnalysis,
  CounterfactualVariant, WorstCaseInterpretation, OverallScores, Verdict,
} from "./types";

export interface ContextualStageData {
  triggerPhrases: TriggerPhraseAnalysis[];
  worstCaseInterpretation: WorstCaseInterpretation;
  redFlags: RedFlag[];
}

export function validateContextual(data: unknown): ContextualStageData | null {
  if (!isRecord(data)) return null;
  const wc = isRecord(data.worstCaseInterpretation) ? data.worstCaseInterpretation : null;
  if (!wc) return null;
  const triggerPhrases: TriggerPhraseAnalysis[] = arr<Record<string, unknown>>(data.triggerPhrases)
    .filter(isRecord)
    .map((t) => ({
      phrase: str(t.phrase, "—"),
      why: str(t.why),
      whoWillAttack: str(t.whoWillAttack),
      howClipped: str(t.howClipped),
      alternative: str(t.alternative),
      action: (["usunąć", "osłabić", "przeramować", "zostawić"].includes(String(t.action)) ? t.action : "przeramować") as TriggerPhraseAnalysis["action"],
      severity: clampNum(t.severity),
    }));
  const redFlags: RedFlag[] = arr<Record<string, unknown>>(data.redFlags)
    .filter(isRecord)
    .map((r) => ({ type: str(r.type, "ryzyko"), description: str(r.description), severity: clampNum(r.severity) }));
  return {
    triggerPhrases,
    redFlags,
    worstCaseInterpretation: {
      outOfContextQuote: str(wc.outOfContextQuote),
      opponentTweet: str(wc.opponentTweet),
      tvChyron: str(wc.tvChyron),
      portalHeadline: str(wc.portalHeadline),
      journalistQuestion: str(wc.journalistQuestion),
      factCheckClaim: str(wc.factCheckClaim),
      disappointedVoterComment: str(wc.disappointedVoterComment),
      memeSummary: str(wc.memeSummary),
    },
  };
}

export function validateSegments(data: unknown): SegmentReaction[] | null {
  if (!isRecord(data)) return null;
  const list = arr<Record<string, unknown>>(data.segmentReactions).filter(isRecord);
  if (list.length === 0) return null;
  return list.map((s) => ({
    segment: str(s.segment, "segment"),
    emotion: str(s.emotion, "brak danych"),
    acceptance: clampNum(s.acceptance),
    outrage: clampNum(s.outrage),
    engagementLikelihood: clampNum(s.engagementLikelihood),
    sampleComment: str(s.sampleComment),
    mainArgument: str(s.mainArgument),
    uncertainty: (["niska", "srednia", "wysoka"].includes(String(s.uncertainty)) ? s.uncertainty : "srednia") as SegmentReaction["uncertainty"],
  }));
}

export function validateOpponents(data: unknown): OpponentAttack[] | null {
  if (!isRecord(data)) return null;
  const list = arr<Record<string, unknown>>(data.opponentAttacks).filter(isRecord);
  if (list.length === 0) return null;
  const validVectors = ["lewica", "prawica", "liberalny", "populistyczny", "ekspercki", "personalny", "memiczny"];
  return list.map((o) => ({
    vector: (validVectors.includes(String(o.vector)) ? o.vector : "ekspercki") as OpponentAttack["vector"],
    from: str(o.from, "przeciwnik polityczny"),
    attack: str(o.attack),
    severity: clampNum(o.severity),
  }));
}

export interface MediaStageData {
  mediaFrames: MediaFrame[];
  escalationTimeline: EscalationStage[];
}

export function validateMedia(data: unknown): MediaStageData | null {
  if (!isRecord(data)) return null;
  const frames = arr<Record<string, unknown>>(data.mediaFrames).filter(isRecord);
  const timeline = arr<Record<string, unknown>>(data.escalationTimeline).filter(isRecord);
  if (frames.length === 0 && timeline.length === 0) return null;
  const validCats = ["przychylne", "wrogie", "neutralne", "tabloidy", "lokalne", "tv_informacyjne", "fact_checkerzy", "konta_x"];
  const validRisk = ["niskie", "srednie", "wysokie"];
  const validLifespan = ["kilka godzin", "24h", "48h", "tydzień"];
  return {
    mediaFrames: frames.map((f) => ({
      category: (validCats.includes(String(f.category)) ? f.category : "neutralne") as MediaFrame["category"],
      likelyHeadline: str(f.likelyHeadline),
      extractedQuote: str(f.extractedQuote),
      frame: str(f.frame),
      riskLevel: (validRisk.includes(String(f.riskLevel)) ? f.riskLevel : "srednie") as MediaFrame["riskLevel"],
      lifespan: (validLifespan.includes(String(f.lifespan)) ? f.lifespan : "24h") as MediaFrame["lifespan"],
    })),
    escalationTimeline: timeline.map((t, i) => ({
      stage: typeof t.stage === "number" ? t.stage : i + 1,
      label: str(t.label, `Etap ${i + 1}`),
      window: str(t.window),
      whatHappens: str(t.whatHappens),
      whoAmplifies: str(t.whoAmplifies),
      counterMeasure: str(t.counterMeasure),
      intensity: clampNum(t.intensity),
    })),
  };
}

export interface RewriteStageData {
  counterfactualVariants: CounterfactualVariant[];
  recommendedVariantType: CounterfactualVariant["type"] | null;
}

export function validateRewrite(data: unknown): RewriteStageData | null {
  if (!isRecord(data)) return null;
  const list = arr<Record<string, unknown>>(data.counterfactualVariants).filter(isRecord);
  if (list.length === 0) return null;
  const validTypes = ["bezpieczna", "empatyczna", "ofensywna", "technokratyczna", "social"];
  const variants: CounterfactualVariant[] = list.map((v) => {
    const sc = isRecord(v.scores) ? v.scores : {};
    return {
      type: (validTypes.includes(String(v.type)) ? v.type : "bezpieczna") as CounterfactualVariant["type"],
      label: str(v.label, "Wariant"),
      text: str(v.text),
      scores: {
        attackRisk: clampNum(sc.attackRisk),
        clarity: clampNum(sc.clarity),
        mobilizationPotential: clampNum(sc.mobilizationPotential),
        mediaPotential: clampNum(sc.mediaPotential),
        memeRisk: clampNum(sc.memeRisk),
        goalFit: clampNum(sc.goalFit),
      },
    };
  });
  const rec = validTypes.includes(String(data.recommendedVariantType)) ? (data.recommendedVariantType as CounterfactualVariant["type"]) : variants[0]?.type ?? null;
  return { counterfactualVariants: variants, recommendedVariantType: rec };
}

export interface FinalStageData {
  verdict: Verdict;
  summary: string;
  overallScores: OverallScores;
  strategicRecommendation: StrategicRecommendation;
  silenceTest: SilenceTest;
  uncertaintyLevel: "niska" | "srednia" | "wysoka";
  aiConfidenceNotes: string;
  dataLimitations: string[];
}

export function validateFinal(data: unknown): FinalStageData | null {
  if (!isRecord(data)) return null;
  const sr = isRecord(data.strategicRecommendation) ? data.strategicRecommendation : null;
  const st = isRecord(data.silenceTest) ? data.silenceTest : null;
  const os = isRecord(data.overallScores) ? data.overallScores : null;
  if (!sr || !st || !os) return null;
  const validVerdicts = ["publikowac", "publikowac_po_poprawkach", "wysokie_ryzyko", "nie_publikowac", "potencjal_ofensywny_wymaga_oslony"];
  const validActions = ["atak", "empatia", "fakty", "ironia", "przeprosiny", "milczenie", "zmiana_tematu"];
  const validChannels = ["brak reakcji", "rzecznik", "ekspert", "przyjazne media", "osobiście"];
  return {
    verdict: (validVerdicts.includes(String(data.verdict)) ? data.verdict : "wysokie_ryzyko") as Verdict,
    summary: str(data.summary, "Analiza niepełna — potraktuj wynik jako wstępny sygnał."),
    overallScores: {
      mobilizationPotential: clampNum(os.mobilizationPotential),
      crisisRisk: clampNum(os.crisisRisk),
      outOfContextVulnerability: clampNum(os.outOfContextVulnerability),
      clarity: clampNum(os.clarity),
      memeRisk: clampNum(os.memeRisk),
      mediaPotential: clampNum(os.mediaPotential),
      centerCost: clampNum(os.centerCost),
      ownBaseGain: clampNum(os.ownBaseGain),
    },
    strategicRecommendation: {
      action: (validActions.includes(String(sr.action)) ? sr.action : "fakty") as StrategicRecommendation["action"],
      whatToDo: str(sr.whatToDo),
      whatToAvoid: str(sr.whatToAvoid),
      mustSaySentence: str(sr.mustSaySentence),
      killerSentence: str(sr.killerSentence, "brak"),
      saverSentence: str(sr.saverSentence),
      firstCounterResponse: str(sr.firstCounterResponse),
      backupStatement: str(sr.backupStatement),
      whatToMonitor: arr<string>(sr.whatToMonitor).filter((x) => typeof x === "string"),
      whenToReactAgain: str(sr.whenToReactAgain),
    },
    silenceTest: {
      isResponseNeeded: Boolean(st.isResponseNeeded),
      wouldResponseAmplify: Boolean(st.wouldResponseAmplify),
      isSilenceSafer: Boolean(st.isSilenceSafer),
      whenToReturn: str(st.whenToReturn),
      recommendedChannel: (validChannels.includes(String(st.recommendedChannel)) ? st.recommendedChannel : "rzecznik") as SilenceTest["recommendedChannel"],
      reasoning: str(st.reasoning),
    },
    uncertaintyLevel: (["niska", "srednia", "wysoka"].includes(String(data.uncertaintyLevel)) ? data.uncertaintyLevel : "wysoka") as FinalStageData["uncertaintyLevel"],
    aiConfidenceNotes: str(data.aiConfidenceNotes, "Ocena oparta wyłącznie na treści draftu i lokalnym słowniku ryzyka, bez danych zewnętrznych."),
    dataLimitations: arr<string>(data.dataLimitations).filter((x) => typeof x === "string"),
  };
}
