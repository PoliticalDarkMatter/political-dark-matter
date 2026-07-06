// ── Political Image Reaction Simulator / Visual Narrative Lab ────────
// Typy współdzielone między local-scan (deterministyczny), warstwą AI
// (ai-provider, prompts, orchestrator), API route'em i UI. Ten sam
// kontrakt co lib/reaction-simulator/types.ts dla modułu tekstowego:
// AI nigdy nie zwraca do UI luźnej ściany tekstu, tylko wypełnia ten
// strukturalny obiekt. Kilka typów jest świadomie re-używanych z modułu
// tekstowego (RiskTolerance, Topic, MediaCategory) — to te same pojęcia,
// nie ma sensu duplikować enumów.

import type { MediaCategory, RiskTolerance, Topic } from "../reaction-simulator/types";
export type { RiskTolerance, Topic, MediaCategory };

export type ImageFormat = "jpg" | "png" | "webp" | "nieznany";

export type ImageChannel =
  | "x" | "facebook" | "instagram" | "tiktok" | "youtube_thumbnail"
  | "portal" | "newsletter" | "konferencja" | "plakat" | "reklama"
  | "baner" | "material_prasowy";

export type ImageGoal =
  | "ocieplic_wizerunek" | "pokazac_sile" | "pokazac_empatie" | "pokazac_sprawczosc"
  | "pokazac_bliskosc" | "pokazac_ekspertckosc" | "pokazac_normalnosc"
  | "zaatakowac_przeciwnika" | "zneutralizowac_kryzys" | "przejac_temat"
  | "wywolac_emocje" | "zbudowac_symbol";

export type EventType = "publiczne" | "polprywatne" | "oficjalne";

export interface ImageSimulationInput {
  // Obraz — zawsze downscalowany po stronie klienta przed wysyłką (patrz
  // ImageDropzone.tsx), oryginał zostaje lokalnie tylko do podglądu.
  imageBase64: string; // bez prefiksu "data:...;base64,"
  mimeType: string; // "image/jpeg" | "image/png" | "image/webp"
  width: number; // wymiary PRZED downscalem — do oceny realnej rozdzielczości
  height: number;
  fileSizeBytes: number;

  who: string; // kto jest na zdjęciu
  topic: Topic | "";
  channel: ImageChannel | "";
  goal: ImageGoal | "";
  eventType: EventType | "";
  isCrisisResponse: boolean;
  isCounterAttack: boolean;
  riskTolerance: RiskTolerance;
}

// ── Krok 1: Local Image Pre-Scan (deterministyczny, bez AI) ──────────
export interface PlatformFitEntry {
  platform: string;
  fit: "dobre" | "wymaga_cropu" | "zle";
  note: string;
}

export interface ImageLocalScanResult {
  format: ImageFormat;
  width: number;
  height: number;
  aspectRatioLabel: string; // np. "4:3", "16:9", "1:1"
  megapixels: number;
  fileSizeMb: number;
  isHighRes: boolean;
  platformFit: PlatformFitEntry[];
  warnings: string[];
}

// ── Krok 2: Vision Observation — neutralny opis, bez interpretacji ───
export interface ImageObservation {
  mainSubject: string;
  peopleCount: number;
  scene: string;
  facialExpression: string;
  pose: string;
  gesture: string;
  background: string;
  props: string[];
  composition: string;
  spatialRelations: string;
  emotion: string;
  lightingQuality: string;
  looksNatural: boolean;
  looksStaged: boolean;
  notableRiskyElements: string[];
  rawDescription: string;
}

// ── Krok 3: Visual Risk Analysis ──────────────────────────────────────
export type VisualRiskFactorType =
  | "meme" | "arogancja" | "sztucznosc" | "slabosc" | "chaos" | "agresja"
  | "brak_empatii" | "elitarnosc" | "oderwanie_od_ludzi" | "zle_tlo"
  | "niekorzystna_mimika" | "niekorzystny_gest" | "przypadkowe_symbole"
  | "zly_crop" | "niechciane_skojarzenia";

export interface VisualRiskFactor {
  factor: VisualRiskFactorType;
  label: string;
  score: number; // 0-100
  reason: string;
}

export interface RiskHotspot {
  label: string;
  x: number; // % szerokości, 0-100 — pozycja markera na podglądzie
  y: number; // % wysokości, 0-100
  kind: "ryzyko" | "atut";
  note: string;
}

// ── Krok 4: Meme Potential Analysis ───────────────────────────────────
export type MemeTone = "ironiczny" | "agresywny" | "klasowy" | "obyczajowy" | "pokoleniowy" | "antyelitarny" | "antysystemowy";

export interface MemeScenario {
  format: string;
  caption: string;
  tone: MemeTone;
  riskLevel: "niskie" | "srednie" | "wysokie";
}

export interface MemePotential {
  isMemeable: boolean;
  score: number; // 0-100
  mostMemeableElement: string;
  possibleCaptions: string[];
  tones: MemeTone[];
  viralPotential: "pozytywny" | "negatywny" | "oba" | "niski";
  canMainstream: boolean;
  defenseAdvice: string;
  canCaptionDisarm: boolean;
}

// ── Krok 5: Segment Simulation ────────────────────────────────────────
export interface SegmentImageReaction {
  segment: string;
  emotion: string;
  interpretation: string;
  acceptance: number; // 0-100
  risk: number; // 0-100
  likelyComment: string;
  strengthensOrWeakens: "wzmacnia" | "oslabia" | "neutralne";
  improvementTip: string;
}

// ── Krok 6: Opponent Room ─────────────────────────────────────────────
export type ImageAttackVector =
  | "lewica" | "prawica" | "liberalny" | "populistyczny" | "ekspercki" | "personalny"
  | "memiczny" | "klasowy" | "pokoleniowy" | "oderwanie_od_rzeczywistosci" | "ustawka_i_propaganda";

export interface OpponentImageAttack {
  vector: ImageAttackVector;
  from: string;
  attack: string;
  severity: number; // 0-100
}

// ── Krok 7: Media Room ────────────────────────────────────────────────
export interface MediaImageFrame {
  category: MediaCategory;
  agencyCaption: string;
  portalHeadline: string;
  tvChyron: string;
  lead: string;
  columnistComment: string;
  negativeUseRisk: "niskie" | "srednie" | "wysokie";
  illustratesBiggerNarrative: boolean;
}

// ── Krok 8: Caption Room ──────────────────────────────────────────────
export type CaptionType =
  | "bezpieczny" | "mocny" | "ludzki" | "empatyczny" | "ofensywny"
  | "neutralizujacy_memicznosc" | "pod_x" | "pod_facebook" | "pod_instagram"
  | "pod_portal" | "do_newslettera";

export interface CaptionRecommendation {
  type: CaptionType;
  label: string;
  text: string;
  risk: number; // 0-100
  tone: string;
  strengthensImage: boolean;
  disarmsRisk: boolean;
  mayCreateNewProblem: boolean;
}

export interface CaptionRisk {
  avoid: string;
  why: string;
}

// ── Krok 9: Image Evolution Timeline ──────────────────────────────────
export interface ImageEvolutionStage {
  window: string; // "0–1h", "1–3h", "3–8h", "8–24h", "24–48h", "48h+"
  label: string;
  whatMayHappen: string;
  whoAmplifies: string;
  likelyComment: string;
  howToReact: string;
  whatNotToDo: string;
  intensity: number; // 0-100
}

// ── Krok 10: Final Strategic Recommendation ───────────────────────────
export type ImageVerdict =
  | "publikowac"
  | "publikowac_po_poprawkach"
  | "wysokie_ryzyko"
  | "nie_publikowac"
  | "publikowac_z_oslona"
  | "dobry_kadr_zly_kontekst"
  | "potencjal_ale_memizacja"
  | "lepsze_wewnetrznie";

export interface CropRecommendation {
  type: "crop" | "alternatywne_zdjecie" | "seria_zdjec" | "bez_zmian";
  description: string;
  reason: string;
}

export interface AlternativeUseRecommendation {
  useCase: string;
  description: string;
}

export interface ImageStrategicRecommendation {
  channel: string;
  caption: string;
  crop: string;
  needsRetouch: boolean;
  needsDifferentImage: boolean;
  needsSeries: boolean;
  needsTextualCover: boolean;
  biggestVisualProblem: string;
  biggestVisualAsset: string;
  firstCounterAttack: string;
}

export interface ImageOverallScores {
  authenticity: number;
  empathy: number;
  agency: number; // sprawczość
  strengthAuthority: number;
  closenessToPeople: number;
  memeRisk: number;
  arroganceRisk: number;
  artificialityRisk: number;
  outOfContextRisk: number;
  viralPotential: number;
  centerCost: number;
  ownBaseGain: number;
  channelFit: number;
}

// ── Statusy etapów pipeline'u AI (10 kroków, sekcja 7.2 specyfikacji) ─
export type ImageStageId =
  | "local_scan" | "vision_observation" | "visual_risk" | "meme_potential"
  | "segments" | "opponents" | "media" | "caption" | "evolution" | "final";

export type ImageStageStatus = "oczekuje" | "analizuje" | "gotowe" | "blad" | "fallback";

export interface ImageStageEvent {
  stage: ImageStageId;
  status: ImageStageStatus;
  label: string;
  data?: unknown;
  error?: string;
}

// ── Pełny wynik symulacji ─────────────────────────────────────────────
export interface ImageReactionSimulationResult {
  input: Omit<ImageSimulationInput, "imageBase64">; // obraz nie wraca w wyniku — tylko kontekst
  localScan: ImageLocalScanResult;
  verdict: ImageVerdict;
  summary: string;
  imageObservation: ImageObservation;
  overallScores: ImageOverallScores;
  visualRiskFactors: VisualRiskFactor[];
  riskHotspots: RiskHotspot[];
  memePotential: MemePotential;
  memeScenarios: MemeScenario[];
  segmentReactions: SegmentImageReaction[];
  mediaFrames: MediaImageFrame[];
  opponentAttacks: OpponentImageAttack[];
  captionRisks: CaptionRisk[];
  captionRecommendations: CaptionRecommendation[];
  platformFit: PlatformFitEntry[];
  evolutionTimeline: ImageEvolutionStage[];
  cropRecommendations: CropRecommendation[];
  alternativeUseRecommendations: AlternativeUseRecommendation[];
  strategicRecommendation: ImageStrategicRecommendation;
  aiConfidenceNotes: string;
  dataLimitations: string[];
  uncertaintyLevel: "niska" | "srednia" | "wysoka";
  recommendedAction: string; // jedno zdanie — najważniejsza, natychmiast czytelna rekomendacja
  generatedAt: string;
  usedFallback: ImageStageId[];
}

// ── Tryby widoku (przełącznik, nie osobne zapytania) ─────────────────
export type ImageLabMode = "pelny" | "meme" | "opponent" | "media" | "segments" | "caption" | "evolution";
