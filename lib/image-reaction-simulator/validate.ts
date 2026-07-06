// ── Walidacja odpowiedzi AI (Vision) ──────────────────────────────────
// Re-używa generycznych helperów z lib/reaction-simulator/validate.ts
// (extractJson/isRecord/clampNum/str/arr) — to czysta logika bez żadnej
// zależności od typów tekstowego modułu, więc dzielenie jej między oba
// moduły jest bezpieczne i zgodne z zasadą "nie duplikuj, jeśli można
// współdzielić" (sekcja 0.2 specyfikacji). Ten plik dodaje tylko
// walidatory KSZTAŁTU specyficzne dla ImageReactionSimulationResult.

export { extractJson, isRecord, clampNum, str, arr } from "../reaction-simulator/validate";
import { arr, clampNum, isRecord, str } from "../reaction-simulator/validate";

import { ALL_ATTACK_VECTORS, ALL_CAPTION_TYPES, ALL_VISUAL_RISK_FACTORS, VISUAL_RISK_FACTOR_LABELS } from "./mock-data";
import type {
  CaptionRecommendation, CaptionRisk, ImageAttackVector, ImageEvolutionStage, ImageObservation,
  ImageOverallScores, ImageStrategicRecommendation, ImageVerdict, MediaImageFrame, MemePotential,
  MemeScenario, OpponentImageAttack, RiskHotspot, SegmentImageReaction, VisualRiskFactor,
  CropRecommendation, AlternativeUseRecommendation,
} from "./types";

// ── Krok 2: Vision Observation ────────────────────────────────────────
export function validateObservation(data: unknown): ImageObservation | null {
  if (!isRecord(data)) return null;
  if (!str(data.mainSubject) && !str(data.rawDescription)) return null;
  return {
    mainSubject: str(data.mainSubject, "nieokreślony"),
    peopleCount: typeof data.peopleCount === "number" ? Math.max(0, Math.round(data.peopleCount)) : 1,
    scene: str(data.scene),
    facialExpression: str(data.facialExpression),
    pose: str(data.pose),
    gesture: str(data.gesture),
    background: str(data.background),
    props: arr<string>(data.props).filter((x) => typeof x === "string"),
    composition: str(data.composition),
    spatialRelations: str(data.spatialRelations),
    emotion: str(data.emotion),
    lightingQuality: str(data.lightingQuality),
    looksNatural: Boolean(data.looksNatural),
    looksStaged: Boolean(data.looksStaged),
    notableRiskyElements: arr<string>(data.notableRiskyElements).filter((x) => typeof x === "string"),
    rawDescription: str(data.rawDescription, "Brak szczegółowego opisu."),
  };
}

// ── Krok 3: Visual Risk Analysis ──────────────────────────────────────
export interface RiskStageData {
  visualRiskFactors: VisualRiskFactor[];
  riskHotspots: RiskHotspot[];
}

export function validateRisk(data: unknown): RiskStageData | null {
  if (!isRecord(data)) return null;
  const factors = arr<Record<string, unknown>>(data.visualRiskFactors).filter(isRecord);
  if (factors.length === 0) return null;
  const validFactors = new Set(ALL_VISUAL_RISK_FACTORS as string[]);
  return {
    visualRiskFactors: factors.map((f) => {
      const factor = (validFactors.has(String(f.factor)) ? f.factor : "meme") as VisualRiskFactor["factor"];
      return { factor, label: VISUAL_RISK_FACTOR_LABELS[factor], score: clampNum(f.score), reason: str(f.reason) };
    }),
    riskHotspots: arr<Record<string, unknown>>(data.riskHotspots).filter(isRecord).map((h) => ({
      label: str(h.label, "element"),
      x: clampNum(h.x, 50),
      y: clampNum(h.y, 50),
      kind: (h.kind === "atut" ? "atut" : "ryzyko") as RiskHotspot["kind"],
      note: str(h.note),
    })),
  };
}

// ── Krok 4: Meme Potential ─────────────────────────────────────────────
export interface MemeStageData {
  memePotential: MemePotential;
  memeScenarios: MemeScenario[];
}

const VALID_TONES = ["ironiczny", "agresywny", "klasowy", "obyczajowy", "pokoleniowy", "antyelitarny", "antysystemowy"];

export function validateMeme(data: unknown): MemeStageData | null {
  if (!isRecord(data)) return null;
  const mp = isRecord(data.memePotential) ? data.memePotential : null;
  if (!mp) return null;
  const scenarios = arr<Record<string, unknown>>(data.memeScenarios).filter(isRecord);
  return {
    memePotential: {
      isMemeable: Boolean(mp.isMemeable),
      score: clampNum(mp.score),
      mostMemeableElement: str(mp.mostMemeableElement),
      possibleCaptions: arr<string>(mp.possibleCaptions).filter((x) => typeof x === "string"),
      tones: arr<string>(mp.tones).filter((t) => VALID_TONES.includes(t)) as MemePotential["tones"],
      viralPotential: (["pozytywny", "negatywny", "oba", "niski"].includes(String(mp.viralPotential)) ? mp.viralPotential : "niski") as MemePotential["viralPotential"],
      canMainstream: Boolean(mp.canMainstream),
      defenseAdvice: str(mp.defenseAdvice),
      canCaptionDisarm: Boolean(mp.canCaptionDisarm),
    },
    memeScenarios: scenarios.map((s) => ({
      format: str(s.format, "format nieokreślony"),
      caption: str(s.caption),
      tone: (VALID_TONES.includes(String(s.tone)) ? s.tone : "ironiczny") as MemeScenario["tone"],
      riskLevel: (["niskie", "srednie", "wysokie"].includes(String(s.riskLevel)) ? s.riskLevel : "srednie") as MemeScenario["riskLevel"],
    })),
  };
}

// ── Krok 5: Segment Simulation ─────────────────────────────────────────
export function validateSegments(data: unknown): SegmentImageReaction[] | null {
  if (!isRecord(data)) return null;
  const list = arr<Record<string, unknown>>(data.segmentReactions).filter(isRecord);
  if (list.length === 0) return null;
  return list.map((s) => ({
    segment: str(s.segment, "segment"),
    emotion: str(s.emotion, "brak danych"),
    interpretation: str(s.interpretation),
    acceptance: clampNum(s.acceptance),
    risk: clampNum(s.risk),
    likelyComment: str(s.likelyComment),
    strengthensOrWeakens: (["wzmacnia", "oslabia", "neutralne"].includes(String(s.strengthensOrWeakens)) ? s.strengthensOrWeakens : "neutralne") as SegmentImageReaction["strengthensOrWeakens"],
    improvementTip: str(s.improvementTip),
  }));
}

// ── Krok 6: Opponent Room ──────────────────────────────────────────────
export function validateOpponents(data: unknown): OpponentImageAttack[] | null {
  if (!isRecord(data)) return null;
  const list = arr<Record<string, unknown>>(data.opponentAttacks).filter(isRecord);
  if (list.length === 0) return null;
  const valid = new Set(ALL_ATTACK_VECTORS as string[]);
  return list.map((o) => ({
    vector: (valid.has(String(o.vector)) ? o.vector : "ekspercki") as ImageAttackVector,
    from: str(o.from, "przeciwnik polityczny"),
    attack: str(o.attack),
    severity: clampNum(o.severity),
  }));
}

// ── Krok 7: Media Room ─────────────────────────────────────────────────
export function validateMedia(data: unknown): MediaImageFrame[] | null {
  if (!isRecord(data)) return null;
  const list = arr<Record<string, unknown>>(data.mediaFrames).filter(isRecord);
  if (list.length === 0) return null;
  const validCats = ["przychylne", "wrogie", "neutralne", "tabloidy", "lokalne", "tv_informacyjne", "fact_checkerzy", "konta_x"];
  return list.map((f) => ({
    category: (validCats.includes(String(f.category)) ? f.category : "neutralne") as MediaImageFrame["category"],
    agencyCaption: str(f.agencyCaption),
    portalHeadline: str(f.portalHeadline),
    tvChyron: str(f.tvChyron),
    lead: str(f.lead),
    columnistComment: str(f.columnistComment),
    negativeUseRisk: (["niskie", "srednie", "wysokie"].includes(String(f.negativeUseRisk)) ? f.negativeUseRisk : "srednie") as MediaImageFrame["negativeUseRisk"],
    illustratesBiggerNarrative: Boolean(f.illustratesBiggerNarrative),
  }));
}

// ── Krok 8: Caption Room ────────────────────────────────────────────────
export interface CaptionStageData {
  captionRecommendations: CaptionRecommendation[];
  captionRisks: CaptionRisk[];
}

export function validateCaption(data: unknown): CaptionStageData | null {
  if (!isRecord(data)) return null;
  const list = arr<Record<string, unknown>>(data.captionRecommendations).filter(isRecord);
  if (list.length === 0) return null;
  const valid = new Set(ALL_CAPTION_TYPES as string[]);
  return {
    captionRecommendations: list.map((c) => ({
      type: (valid.has(String(c.type)) ? c.type : "bezpieczny") as CaptionRecommendation["type"],
      label: str(c.label, "Podpis"),
      text: str(c.text),
      risk: clampNum(c.risk),
      tone: str(c.tone),
      strengthensImage: Boolean(c.strengthensImage),
      disarmsRisk: Boolean(c.disarmsRisk),
      mayCreateNewProblem: Boolean(c.mayCreateNewProblem),
    })),
    captionRisks: arr<Record<string, unknown>>(data.captionRisks).filter(isRecord).map((r) => ({
      avoid: str(r.avoid, "—"), why: str(r.why),
    })),
  };
}

// ── Krok 9: Evolution Timeline ─────────────────────────────────────────
export function validateEvolution(data: unknown): ImageEvolutionStage[] | null {
  if (!isRecord(data)) return null;
  const list = arr<Record<string, unknown>>(data.evolutionTimeline).filter(isRecord);
  if (list.length === 0) return null;
  return list.map((t, i) => ({
    window: str(t.window, `Etap ${i + 1}`),
    label: str(t.label),
    whatMayHappen: str(t.whatMayHappen),
    whoAmplifies: str(t.whoAmplifies),
    likelyComment: str(t.likelyComment),
    howToReact: str(t.howToReact),
    whatNotToDo: str(t.whatNotToDo),
    intensity: clampNum(t.intensity),
  }));
}

// ── Krok 10: Final Recommendation ──────────────────────────────────────
export interface FinalStageData {
  verdict: ImageVerdict;
  summary: string;
  recommendedAction: string;
  overallScores: ImageOverallScores;
  cropRecommendations: CropRecommendation[];
  alternativeUseRecommendations: AlternativeUseRecommendation[];
  strategicRecommendation: ImageStrategicRecommendation;
  uncertaintyLevel: "niska" | "srednia" | "wysoka";
  aiConfidenceNotes: string;
  dataLimitations: string[];
}

const VALID_VERDICTS = [
  "publikowac", "publikowac_po_poprawkach", "wysokie_ryzyko", "nie_publikowac",
  "publikowac_z_oslona", "dobry_kadr_zly_kontekst", "potencjal_ale_memizacja", "lepsze_wewnetrznie",
];

export function validateFinal(data: unknown): FinalStageData | null {
  if (!isRecord(data)) return null;
  const os = isRecord(data.overallScores) ? data.overallScores : null;
  const sr = isRecord(data.strategicRecommendation) ? data.strategicRecommendation : null;
  if (!os || !sr) return null;
  return {
    verdict: (VALID_VERDICTS.includes(String(data.verdict)) ? data.verdict : "wysokie_ryzyko") as ImageVerdict,
    summary: str(data.summary, "Analiza niepełna — potraktuj wynik jako wstępny sygnał."),
    recommendedAction: str(data.recommendedAction, "Uruchom ponownie pełną analizę przed decyzją o publikacji."),
    overallScores: {
      authenticity: clampNum(os.authenticity), empathy: clampNum(os.empathy), agency: clampNum(os.agency),
      strengthAuthority: clampNum(os.strengthAuthority), closenessToPeople: clampNum(os.closenessToPeople),
      memeRisk: clampNum(os.memeRisk), arroganceRisk: clampNum(os.arroganceRisk), artificialityRisk: clampNum(os.artificialityRisk),
      outOfContextRisk: clampNum(os.outOfContextRisk), viralPotential: clampNum(os.viralPotential),
      centerCost: clampNum(os.centerCost), ownBaseGain: clampNum(os.ownBaseGain), channelFit: clampNum(os.channelFit),
    },
    cropRecommendations: arr<Record<string, unknown>>(data.cropRecommendations).filter(isRecord).map((c) => ({
      type: (["crop", "alternatywne_zdjecie", "seria_zdjec", "bez_zmian"].includes(String(c.type)) ? c.type : "bez_zmian") as CropRecommendation["type"],
      description: str(c.description), reason: str(c.reason),
    })),
    alternativeUseRecommendations: arr<Record<string, unknown>>(data.alternativeUseRecommendations).filter(isRecord).map((a) => ({
      useCase: str(a.useCase, "materiał wewnętrzny"), description: str(a.description),
    })),
    strategicRecommendation: {
      channel: str(sr.channel), caption: str(sr.caption), crop: str(sr.crop),
      needsRetouch: Boolean(sr.needsRetouch), needsDifferentImage: Boolean(sr.needsDifferentImage),
      needsSeries: Boolean(sr.needsSeries), needsTextualCover: Boolean(sr.needsTextualCover),
      biggestVisualProblem: str(sr.biggestVisualProblem), biggestVisualAsset: str(sr.biggestVisualAsset),
      firstCounterAttack: str(sr.firstCounterAttack),
    },
    uncertaintyLevel: (["niska", "srednia", "wysoka"].includes(String(data.uncertaintyLevel)) ? data.uncertaintyLevel : "wysoka") as FinalStageData["uncertaintyLevel"],
    aiConfidenceNotes: str(data.aiConfidenceNotes, "Ocena oparta wyłącznie na lokalnym skanie technicznym, bez pełnej analizy AI."),
    dataLimitations: arr<string>(data.dataLimitations).filter((x) => typeof x === "string"),
  };
}
