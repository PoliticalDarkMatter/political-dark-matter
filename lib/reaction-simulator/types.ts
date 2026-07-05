// ── Political Reaction Simulator / Narrative Impact Lab ──────────────
// Typy współdzielone między silnikiem lokalnym (local-scan), warstwą AI
// (ai-provider, prompts, orchestrator), API route'em i UI. Trzymane w
// jednym miejscu, żeby raport był zawsze strukturalny — AI nigdy nie
// zwraca do UI luźnej ściany tekstu, tylko wypełnia ten kontrakt.

export type RiskTolerance = "niskie" | "srednie" | "wysokie" | "zwarcie";

export type CommunicationGoal =
  | "mobilizacja_wlasnych"
  | "przekonanie_centrum"
  | "neutralizacja_kryzysu"
  | "atak_na_przeciwnika"
  | "odwrocenie_uwagi"
  | "przejecie_tematu"
  | "obnizenie_temperatury"
  | "wymuszenie_reakcji_mediow"
  | "kontrast_moralny"
  | "pokazanie_sprawczosci";

export type CommFormat =
  | "tweet_x" | "konferencja" | "wywiad_tv" | "tiktok" | "sejm"
  | "facebook" | "oswiadczenie" | "briefing" | "debata";

export type CommSituation =
  | "atak" | "obrona" | "przeprosiny" | "wyjasnienie" | "ofensywa"
  | "mobilizacja_wlasnych" | "neutralizacja_kryzysu";

export type PoliticianRole = "lider" | "minister" | "posel" | "kandydat" | "rzecznik" | "samorzadowiec";

export type Topic =
  | "gospodarka" | "migracja" | "zdrowie" | "edukacja" | "bezpieczenstwo"
  | "klimat" | "kosciol" | "obyczaje" | "wojna" | "podatki" | "samorzad" | "kryzys";

export interface SimulationInput {
  text: string;
  topic: Topic | "";
  format: CommFormat | "";
  situation: CommSituation | "";
  role: PoliticianRole | "";
  targetAudience: string;
  goal: CommunicationGoal | "";
  riskTolerance: RiskTolerance;
}

// ── Local Pre-Scan (deterministyczny, bez LLM) ────────────────────────
export interface TriggerMatch {
  phrase: string;
  weight: number;
  reason: string;
}

export type RiskBand = "niskie" | "umiarkowane" | "wysokie" | "bardzo_wysokie";

export interface LocalScanResult {
  triggerMatches: TriggerMatch[];
  baseRiskScore: number; // 0-100, suma wag + modyfikatory kontekstu
  riskBand: RiskBand;
  toneLabel: string;
  likelyCrisisArchetype: string | null;
  formatRiskNote: string | null;
}

// ── Segment reactions ──────────────────────────────────────────────
export interface SegmentReaction {
  segment: string;
  emotion: string;
  acceptance: number; // 0-100
  outrage: number; // 0-100
  engagementLikelihood: number; // 0-100
  sampleComment: string;
  mainArgument: string;
  uncertainty: "niska" | "srednia" | "wysoka";
}

// ── Media frames ───────────────────────────────────────────────────
export type MediaCategory =
  | "przychylne" | "wrogie" | "neutralne" | "tabloidy"
  | "lokalne" | "tv_informacyjne" | "fact_checkerzy" | "konta_x";

export interface MediaFrame {
  category: MediaCategory;
  likelyHeadline: string;
  extractedQuote: string;
  frame: string;
  riskLevel: "niskie" | "srednie" | "wysokie";
  lifespan: "kilka godzin" | "24h" | "48h" | "tydzień";
}

// ── Opponent attacks ───────────────────────────────────────────────
export type AttackVector = "lewica" | "prawica" | "liberalny" | "populistyczny" | "ekspercki" | "personalny" | "memiczny";

export interface OpponentAttack {
  vector: AttackVector;
  from: string;
  attack: string;
  severity: number; // 0-100
}

// ── Frazy zapalne ──────────────────────────────────────────────────
export interface TriggerPhraseAnalysis {
  phrase: string;
  why: string;
  whoWillAttack: string;
  howClipped: string;
  alternative: string;
  action: "usunąć" | "osłabić" | "przeramować" | "zostawić";
  severity: number;
}

// ── Warianty kontrfaktyczne ────────────────────────────────────────
export type VariantType = "bezpieczna" | "empatyczna" | "ofensywna" | "technokratyczna" | "social";

export interface VariantScores {
  attackRisk: number;
  clarity: number;
  mobilizationPotential: number;
  mediaPotential: number;
  memeRisk: number;
  goalFit: number;
}

export interface CounterfactualVariant {
  type: VariantType;
  label: string;
  text: string;
  scores: VariantScores;
}

// ── Eskalacja / propagacja ─────────────────────────────────────────
export interface EscalationStage {
  stage: number;
  label: string;
  window: string;
  whatHappens: string;
  whoAmplifies: string;
  counterMeasure: string;
  intensity: number; // 0-100
}

// ── Destroy mode / najgorsze odczytanie ───────────────────────────
export interface WorstCaseInterpretation {
  outOfContextQuote: string;
  opponentTweet: string;
  tvChyron: string;
  portalHeadline: string;
  journalistQuestion: string;
  factCheckClaim: string;
  disappointedVoterComment: string;
  memeSummary: string;
}

// ── Silence test ───────────────────────────────────────────────────
export interface SilenceTest {
  isResponseNeeded: boolean;
  wouldResponseAmplify: boolean;
  isSilenceSafer: boolean;
  whenToReturn: string;
  recommendedChannel: "brak reakcji" | "rzecznik" | "ekspert" | "przyjazne media" | "osobiście";
  reasoning: string;
}

// ── Red flags ──────────────────────────────────────────────────────
export interface RedFlag {
  type: string;
  description: string;
  severity: number;
}

// ── Rekomendacja strategiczna ──────────────────────────────────────
export interface StrategicRecommendation {
  action: "atak" | "empatia" | "fakty" | "ironia" | "przeprosiny" | "milczenie" | "zmiana_tematu";
  whatToDo: string;
  whatToAvoid: string;
  mustSaySentence: string;
  killerSentence: string; // "one sentence that kills you"
  saverSentence: string;  // "one sentence that saves you"
  firstCounterResponse: string;
  backupStatement: string;
  whatToMonitor: string[];
  whenToReactAgain: string;
}

// ── Zbiorczy scoring ───────────────────────────────────────────────
export interface OverallScores {
  mobilizationPotential: number;
  crisisRisk: number;
  outOfContextVulnerability: number;
  clarity: number;
  memeRisk: number;
  mediaPotential: number;
  centerCost: number;
  ownBaseGain: number;
}

export type Verdict =
  | "publikowac"
  | "publikowac_po_poprawkach"
  | "wysokie_ryzyko"
  | "nie_publikowac"
  | "potencjal_ofensywny_wymaga_oslony";

// ── Statusy etapów pipeline'u AI ───────────────────────────────────
export type StageId = "local_scan" | "contextual" | "segments" | "opponents" | "media" | "rewrite" | "final";

export type StageStatus = "oczekuje" | "analizuje" | "gotowe" | "blad" | "fallback";

export interface StageEvent {
  stage: StageId;
  status: StageStatus;
  label: string;
  data?: unknown;
  error?: string;
}

// ── Pełny wynik symulacji ──────────────────────────────────────────
export interface ReactionSimulationResult {
  input: SimulationInput;
  localScan: LocalScanResult;
  verdict: Verdict;
  summary: string;
  overallScores: OverallScores;
  segmentReactions: SegmentReaction[];
  mediaFrames: MediaFrame[];
  triggerPhrases: TriggerPhraseAnalysis[];
  worstCaseInterpretation: WorstCaseInterpretation;
  opponentAttacks: OpponentAttack[];
  escalationTimeline: EscalationStage[];
  counterfactualVariants: CounterfactualVariant[];
  recommendedVariantType: VariantType | null;
  strategicRecommendation: StrategicRecommendation;
  silenceTest: SilenceTest;
  redFlags: RedFlag[];
  uncertaintyLevel: "niska" | "srednia" | "wysoka";
  aiConfidenceNotes: string;
  dataLimitations: string[];
  generatedAt: string;
  usedFallback: StageId[];
}

// ── Tryby specjalne (przełącznik widoku, nie osobne zapytania) ─────
export type LabMode = "pelny" | "pre_mortem" | "opponent" | "media" | "people" | "rewrite" | "red_flags" | "silence";
