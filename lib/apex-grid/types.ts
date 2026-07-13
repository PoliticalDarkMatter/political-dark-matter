// ── Apex Grid — typy ───────────────────────────────────────────────────
// Moduł ANALIZY STRATEGICZNEJ: jedyny moduł platformy, którego produktem
// jest DECYZJA, nie dane. Pipeline pięciu warstw (spec: dokument
// "Apex_Grid_plan_modulu.docx" w folderze projektu):
//
//   1. Sygnał   → Narrative Scope (buildFeed): co się dzieje, jak szybko
//   2. Grunt    → Insight Base (query_insight): co myślą grupy społeczne
//   3. Narada   → Konsylium (reużyte profile ekspertów, skład per produkt)
//   4. Scenariusze → warianty działania z osią czasu i oceną ryzyko/zysk
//   5. Decyzja  → jedna rekomendacja z mapą skutków i kontratakami
//
// Ten sam kontrakt typów-jako-dane co lib/consilium/types.ts: AI nigdy
// nie zwraca do UI luźnej ściany tekstu, tylko wypełnia strukturę stąd.
// ZASADA MODYFIKOWALNOŚCI: wszystko, co Jan może chcieć zmienić
// (produkty, skład narady, akcenty promptów), mieszka w products.ts jako
// dane — nie w kodzie orchestratora.

import type { ExpertId, ExpertOpinion } from "@/lib/consilium/types";

// ── Wejście ────────────────────────────────────────────────────────────
export type ApexProduct = "sdp" | "brief" | "kryzys";

export interface ApexInput {
  topic: string; // sprawa / pytanie / dylemat / atak, wokół którego zapada decyzja
  context: string; // kontekst polityczny — wolny opis (opcjonalnie)
  politicalGoal: string; // co polityk chce osiągnąć (opcjonalnie)
  targetAudience: string; // o które grupy toczy się gra (opcjonalnie)
  zalozenia?: string; // konstytucja zalozen strategicznych (lib/zalozenia)
  product: ApexProduct;
}

// ── Warstwa 1: Sygnał (Narrative Scope) ────────────────────────────────
// Deterministyczna poza ekstrakcją fraz (Gemini) — realne wyszukiwanie
// przez buildFeed, zero AI-zgadywania. hasRealData=false znaczy "nic nie
// znaleziono", co dalsze warstwy mają jawnie uwzględnić, nie ukrywać.
export interface SignalSource {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
}

export interface SignalNarrative {
  label: string;
  count: number;
  velocity: number | null;
}

export interface SignalContext {
  query: string;
  hasRealData: boolean;
  totalFound: number;
  sources: SignalSource[];
  narratives: SignalNarrative[];
  sentiment: { positive: number; negative: number; neutral: number };
  digest: string; // gotowe do wstrzyknięcia w prompty streszczenie warstwy
}

// ── Warstwa 2: Grunt (Insight Base) ────────────────────────────────────
// W CAŁOŚCI deterministyczna (zero LLM) — odpytuje query_insight w
// Supabase i składa digest z realnych syntez i findings z podanymi
// źródłami. Pusta baza / brak trafień = hasData:false, jawnie w digest.
export interface GroundSynthesis {
  topic: string;
  text: string;
  divergenceNote: string | null;
}

export interface GroundFinding {
  topic: string;
  value: number | null;
  valueText: string | null;
  quote: string | null;
  confidence: string;
  studyTitle: string;
  sourceUrl: string;
  publishedDate: string | null;
}

export interface GroundContext {
  query: string;
  hasData: boolean;
  syntheses: GroundSynthesis[];
  findings: GroundFinding[];
  digest: string;
}

// ── Warstwa 3: Narada (Konsylium) ──────────────────────────────────────
// Reużywa profile ekspertów, prompty per ekspert i walidację z
// lib/consilium/* — skład narady jest MNIEJSZY niż pełne Konsylium
// (dobierany per produkt w products.ts), bo tu narada jest jedną z pięciu
// warstw pipeline'u, nie samodzielnym modułem. Pełna narada dziesięciu
// ekspertów pozostaje dostępna w /konsylium.
export interface CouncilContext {
  roster: ExpertId[];
  opinions: ExpertOpinion[];
  usedFallback: ExpertId[];
  digest: string;
}

// ── Warstwa 4: Scenariusze ─────────────────────────────────────────────
export interface ScenarioTimeline {
  h48: string; // co się dzieje w pierwszych 48 godzinach
  d7: string; // pierwszy tydzień
  d30: string; // pierwszy miesiąc
}

export interface Scenario {
  id: string; // "A" | "B" | "C" | "D" — D to zawsze wariant "nie robić nic"
  label: string; // krótka nazwa wariantu
  summary: string; // 1-3 zdania: na czym polega wariant
  opponentsReaction: string;
  mediaReaction: string;
  ownBaseReaction: string;
  timeline: ScenarioTimeline;
  riskScore: number; // 0-100
  gainScore: number; // 0-100
  keyRisk: string;
  keyGain: string;
}

// ── Warstwa 5: Decyzja (pakiet decyzyjny) ──────────────────────────────
export type DecisionPriority = "low" | "medium" | "high" | "urgent";

export interface CounterPlay {
  expectedAttack: string; // przewidywany kontratak / zarzut
  response: string; // przygotowana odpowiedź
}

export interface ConsequenceMap {
  political: string[];
  media: string[];
  social: string[];
  internet: string[];
}

export interface DecisionPackage {
  caseTitle: string;
  decision: string; // jasna decyzja: co robić
  chosenScenarioId: string; // który wariant z warstwy 4 wybrano
  rationale: string;
  priority: DecisionPriority;
  consequenceMap: ConsequenceMap;
  messageLines: string[]; // 3-7 gotowych zdań do użycia
  thingsNotToSay: string[];
  counterPlays: CounterPlay[]; // kontratak przeciwnika + nasza odpowiedź
  planB: string; // co robimy, gdy sytuacja pójdzie inną ścieżką
  whatWeKnow: string[]; // twarde: wynika z sygnału/gruntu (źródła)
  whatWeAssume: string[]; // interpretacja / hipoteza strategiczna
  whatToVerify: string[]; // do sprawdzenia przed publicznym użyciem
}

// ── Pełny wynik ────────────────────────────────────────────────────────
export interface ApexResult {
  input: ApexInput;
  signal: SignalContext;
  ground: GroundContext;
  council: CouncilContext;
  scenarios: Scenario[];
  decision: DecisionPackage;
  createdAt: string;
  modelInfo: { provider: string; isReal: boolean };
  scenariosUsedFallback: boolean;
  decisionUsedFallback: boolean;
}

// ── Statusy etapów (streaming NDJSON) ──────────────────────────────────
// Pięć stałych etapów — dokładnie pięć warstw z dokumentu koncepcyjnego,
// żeby UI pokazywało ten sam model myślowy, który zna Ryszard Petru.
// Postęp narady (ekspert po ekspercie) idzie w data: {done, total}.
export type ApexStageId = "signal" | "ground" | "council" | "scenarios" | "decision";

export type ApexStageStatus = "oczekuje" | "analizuje" | "gotowe" | "blad" | "fallback";

export interface ApexStageEvent {
  stage: ApexStageId;
  status: ApexStageStatus;
  label: string;
  data?: unknown;
  error?: string;
}
