// ── e-Konsylium — narada strategiczna dziesięciu ekspertów ──────────────
// Ten sam kontrakt-typów-jako-dane co lib/reaction-simulator/types.ts i
// lib/image-reaction-simulator/types.ts: AI nigdy nie zwraca do UI luźnej
// ściany tekstu, tylko wypełnia strukturę zdefiniowaną tutaj. Różnica
// względem symulatorów: e-Konsylium nie ocenia jednego draftu pod kątem
// ryzyka publikacji, tylko zwołuje dziesięciu niezależnych ekspertów wokół
// dowolnego tematu/pytania/dylematu i syntetyzuje ich stanowiska w jeden
// protokół decyzyjny — to moduł DECYZYJNY, nie chat z ekspertami (patrz
// komentarz w orchestrator.ts).

export type ExpertId =
  | "strateg"
  | "socjolog"
  | "narracja"
  | "spin_doctor"
  | "fact_checker"
  | "prawnik"
  | "ekonomista"
  | "psycholog"
  | "social_media"
  | "red_team";

export type ConsiliumMode =
  | "strategia"
  | "kryzys"
  | "wypowiedz_medialna"
  | "projekt_ustawy"
  | "kampania"
  | "social_media"
  | "debata";

export interface ConsiliumInput {
  topic: string; // pytanie / problem / projekt wypowiedzi / projekt ustawy / kryzys / dylemat
  context: string; // kontekst polityczny — wolny opis (opcjonalnie)
  politicalGoal: string; // co polityk chce osiągnąć (opcjonalnie)
  targetAudience: string; // do kogo ma to trafić (opcjonalnie)
  zalozenia?: string; // konstytucja zalozen strategicznych (lib/zalozenia)
  mode: ConsiliumMode;
}

// ── Research — warstwa researchu, patrz lib/consilium/research.ts ─────
// Reużywa istniejący silnik wyszukiwania (buildFeed, app/api/news/route.ts)
// zamiast budować równoległy system. hasRealData=false oznacza, że nie
// udało się znaleźć żadnych realnych materiałów (albo brak klucza Gemini
// do ekstrakcji fraz) — eksperci mają to jawnie uwzględnić, nie udawać
// researchu, którego nie było.
export interface ResearchSource {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

export interface ResearchContext {
  query: string; // frazy użyte do wyszukania
  hasRealData: boolean;
  sources: ResearchSource[]; // realne materiały znalezione o temacie (do wglądu w UI)
  digest: string; // krótkie, gotowe do wklejenia w prompt streszczenie tego, co znaleziono
  totalFound: number;
}

// ── Opinia pojedynczego eksperta ───────────────────────────────────────
export interface ResearchNotes {
  usedSources: string[];
  missingSources: string[];
  verificationNeeded: string[];
}

export type ConfidenceLevel = "low" | "medium" | "high";

export interface ExpertOpinion {
  expertId: ExpertId;
  expertName: string;
  headline: string; // jedno zdanie — sedno stanowiska
  diagnosis: string; // 2-4 zdania, konkret
  keyFindings: string[];
  opportunities: string[];
  risks: string[];
  recommendations: string[];
  strongestLine: string; // najmocniejszy argument/zdanie z tej perspektywy
  thingsNotToSay: string[];
  openQuestions: string[];
  confidence: ConfidenceLevel;
  researchNotes: ResearchNotes;
}

// ── Synteza e-Konsylium ───────────────────────────────────────────────
export interface RiskMap {
  political: string[];
  legal: string[];
  media: string[];
  social: string[];
  economic: string[];
  internet: string[];
  reputational: string[];
}

export type SynthesisPriority = "low" | "medium" | "high" | "urgent";

export interface FinalRecommendation {
  decision: string; // jasna decyzja: co robić
  rationale: string; // uzasadnienie
  priority: SynthesisPriority;
}

export interface ConsiliumSynthesis {
  caseTitle: string;
  coreDiagnosis: string; // istota sprawy — jednoznacznie, o co naprawdę chodzi
  keyFindings: string[]; // 5-10 najważniejszych wniosków
  consensusProtocol: string[]; // gdzie eksperci się zgadzają, mimo różnych perspektyw
  disagreementProtocol: string[]; // gdzie jest napięcie + jak je rozwiązać w praktyce
  riskMap: RiskMap;
  opportunityMap: string[];
  finalRecommendation: FinalRecommendation;
  messageLines: string[]; // 3-7 gotowych zdań do wykorzystania
  thingsNotToSay: string[];
  verificationChecklist: string[]; // co jeszcze sprawdzić przed publicznym użyciem
}

// ── Pełny wynik e-Konsylium ──────────────────────────────────────────
export interface ConsiliumResult {
  input: ConsiliumInput;
  researchContext: ResearchContext;
  expertOpinions: ExpertOpinion[];
  synthesis: ConsiliumSynthesis;
  createdAt: string;
  modelInfo: {
    provider: string;
    isReal: boolean;
  };
  usedFallback: ExpertId[]; // eksperci, dla których zabrakło realnej odpowiedzi AI (użyto fallbacku)
  synthesisUsedFallback: boolean;
}

// ── Statusy etapów pipeline'u (streaming NDJSON, patrz orchestrator.ts
// i app/api/consilium/route.ts) — jeden etap na "research", po jednym na
// każdego z 10 ekspertów (żeby UI mogło pokazać postęp narady eksperta po
// eksperice, zgodnie z życzeniem "pokazuj, że trwa praca ekspertów"),
// jeden na syntezę. ────────────────────────────────────────────────────
export type StageId = "research" | ExpertId | "synthesis";

export type StageStatus = "oczekuje" | "analizuje" | "gotowe" | "blad" | "fallback";

export interface StageEvent {
  stage: StageId;
  status: StageStatus;
  label: string;
  data?: unknown;
  error?: string;
}
