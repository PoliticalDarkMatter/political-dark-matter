import { AUDIENCE_SEGMENTS, CRISIS_ARCHETYPES } from "./mock-data";
import { effectiveText } from "./local-scan";
import type { LocalScanResult, SimulationInput } from "./types";

// ── Biblioteka promptów — Political Reaction Simulator ────────────────
// Każdy prompt to osobna, wyspecjalizowana funkcja (nie jeden mega-prompt
// schowany w komponencie UI). Wspólne zasady red-teamu i zakaz halucynacji
// są sklejane przez SHARED_RULES, żeby nie duplikować ich osobno w każdym
// promptcie i żeby dało się je zmienić w jednym miejscu (wersjonowanie).
// DOCELOWO: to jest miejsce, gdzie podpiąć few-shot przykłady z Narrative
// Memory (patrz orchestrator.ts) — realne, zweryfikowane analogie
// historyczne zamiast czysto instrukcyjnego promptu.

const SHARED_RULES = `Zasady, których musisz przestrzegać zawsze:
- Jesteś zespołem doradców politycznych grających rolę adwokata diabła, testujących DRAFT przed publikacją.
- Nie zakładaj z góry partii ani nazwiska mówiącego — wnioskuj z treści i podanego kontekstu.
- Nie wymyślaj prawdziwych nazwisk dziennikarzy, prawdziwych cytatów ani nieistniejących wydarzeń. Mów ogólnie: "dziennikarz portalu ogólnopolskiego", "komentator sprzyjający opozycji", "influencer prawicowy" — nigdy o rzeczywistych, nazwanych osobach.
- To jest HIPOTEZA sztucznej inteligencji, nie dane z monitoringu — pisz stanowczo i konkretnie, ale to ma być scenariusz, nie fakt.
- Bądź konkretny i bezlitosny. To ma pomóc przed publikacją, nie pocieszyć po fakcie.
- Zwracaj WYŁĄCZNIE czysty JSON, bez markdown, bez bloków kodu, bez komentarzy przed lub po.`;

// ── Framing zależny od trybu wprowadzania ─────────────────────────────
// To jedyne miejsce, gdzie tryb realnie wpływa na to, co model dostaje —
// reszta pipeline'u (7 promptów, walidacja, typy wyniku) jest identyczna
// dla wszystkich czterech trybów. "wydarzenie_zaistniale" ma inny cel
// analizy (co robić DALEJ, nie czy publikować), więc werdykt i
// rekomendacja mają być interpretowane w tym duchu — bez zmiany schematu
// JSON, tylko przez instrukcję w prompt-cie.
function modeIntro(input: SimulationInput): string {
  switch (input.inputMode) {
    case "wydarzenie_planowane":
      return "Testowany materiał to PLANOWANE DZIAŁANIE LUB DECYZJA, jeszcze nieogłoszone i niewykonane. Oceniasz konsekwencje, zanim cokolwiek się stanie.";
    case "watek":
      return "Testowany materiał to SERIA/WĄTEK powiązanych wypowiedzi, jeszcze nieopublikowanych — oceniasz je jako całość, nie osobno.";
    case "wydarzenie_zaistniale":
      return "Testowany materiał to WYDARZENIE LUB WYPOWIEDŹ, KTÓRE JUŻ ZAISTNIAŁY. Pytanie nie brzmi \"czy publikować\", tylko \"jak reagować dalej\" — werdykt i rekomendacja mają być przeformułowane w tym duchu (np. zamiast \"publikować\" — \"utrzymać kurs / nie komentować dalej\", zamiast \"nie publikować\" — \"pilnie zareagować / sprostować\").";
    case "wypowiedz":
    default:
      return "Testowany materiał to pojedyncza wypowiedź/cytat, jeszcze nieopublikowany.";
  }
}

function contextBlock(input: SimulationInput, localScan: LocalScanResult): string {
  const combined = effectiveText(input);
  const lines = [
    modeIntro(input),
    `Treść (draft): """${combined.slice(0, 3000)}"""`,
    input.inputMode === "wydarzenie_planowane" && input.eventTiming && `Kiedy ma się to stać: ${input.eventTiming}`,
    input.inputMode === "wydarzenie_planowane" && input.eventStakeholders && `Kogo dotyczy: ${input.eventStakeholders}`,
    input.inputMode === "wydarzenie_zaistniale" && input.eventTiming && `Kiedy się to stało: ${input.eventTiming}`,
    input.inputMode === "wydarzenie_zaistniale" && input.eventStakeholders && `Kogo dotyczy: ${input.eventStakeholders}`,
    input.inputMode === "wydarzenie_zaistniale" && input.priorReaction && `Dotychczasowa reakcja (jeśli już coś wiadomo): ${input.priorReaction}`,
    input.inputMode === "wydarzenie_zaistniale" && input.analysisGoal && `Co nadawca chce ustalić: ${input.analysisGoal}`,
    input.topic && `Temat: ${input.topic}`,
    input.format && `Format: ${input.format}`,
    input.situation && `Sytuacja: ${input.situation}`,
    input.role && `Rola mówiącego: ${input.role}`,
    input.targetAudience && `Grupa docelowa: ${input.targetAudience}`,
    input.goal && `Cel komunikacyjny: ${input.goal}`,
    `Akceptowalny poziom ryzyka nadawcy: ${input.riskTolerance}`,
    `Wstępny lokalny skan ryzyka (deterministyczny, bez AI): baseRiskScore=${localScan.baseRiskScore}/100 (${localScan.riskBand}), ton=${localScan.toneLabel}${localScan.likelyCrisisArchetype ? `, prawdopodobny archetyp kryzysu=${localScan.likelyCrisisArchetype}` : ""}.`,
    localScan.triggerMatches.length > 0
      ? `Frazy zapalne wykryte lokalnie: ${localScan.triggerMatches.map((m) => `"${m.phrase}"`).join(", ")}.`
      : "Lokalny skan nie wykrył słów ze słownika fraz zapalnych — nie znaczy to braku ryzyka, oceń treść merytorycznie.",
  ].filter(Boolean);
  return lines.join("\n");
}

// ── Stage: contextual (Risk Engine) ──────────────────────────────────
// Pogłębiona analiza fraz zapalnych + najgorsze możliwe odczytanie
// (Destroy Mode) + red flags. Punkt wyjścia dla lokalnych trafień, ale
// LLM ma prawo dodać własne obserwacje spoza słownika.
export function buildContextualPrompt(input: SimulationInput, localScan: LocalScanResult): string {
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

Zadanie: pogłębiona analiza ryzyka tekstu.

Zwróć JSON:
{
  "triggerPhrases": [
    {"phrase": "dokładny fragment cytowany z draftu", "why": "dlaczego ryzykowne", "whoWillAttack": "kto to zaatakuje", "howClipped": "jak zostanie wyrwane z kontekstu", "alternative": "co powiedzieć zamiast", "action": "usunąć" | "osłabić" | "przeramować" | "zostawić", "severity": liczba 0-100}
  ],
  "worstCaseInterpretation": {
    "outOfContextQuote": "najgorszy możliwy cytat wyrwany z kontekstu",
    "opponentTweet": "najgroźniejszy możliwy tweet przeciwnika (bez realnego nazwiska, opisowo kto)",
    "tvChyron": "pasek telewizyjny",
    "portalHeadline": "tytuł portalu internetowego",
    "journalistQuestion": "pytanie dziennikarza na konferencji",
    "factCheckClaim": "zarzut fact-checkera",
    "disappointedVoterComment": "komentarz rozczarowanego wyborcy",
    "memeSummary": "jednozdaniowy opis mema, który może powstać"
  },
  "redFlags": [
    {"type": "krótka nazwa problemu, np. arogancja / protekcjonalność / sprzeczność", "description": "opis", "severity": liczba 0-100}
  ]
}
Podaj 2-5 pozycji w triggerPhrases (uwzględnij wykryte lokalnie frazy, jeśli są, plus własne obserwacje), 3-6 w redFlags.`;
}

// ── Stage: segments (Segment Simulation) ─────────────────────────────
export function buildSegmentsPrompt(input: SimulationInput, localScan: LocalScanResult): string {
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

Zadanie: zasymuluj reakcję każdego z podanych segmentów odbiorców na ten tekst.
Segmenty: ${AUDIENCE_SEGMENTS.join(", ")}.

Zwróć JSON:
{
  "segmentReactions": [
    {"segment": "dokładna nazwa z listy segmentów", "emotion": "jedna dominująca emocja po polsku (np. oburzenie, aprobata, drwina, lęk, satysfakcja, cynizm, mobilizacja, obojętność)", "acceptance": liczba 0-100, "outrage": liczba 0-100, "engagementLikelihood": liczba 0-100, "sampleComment": "reprezentatywny, realistycznie brzmiący komentarz jakby napisany przez kogoś z tego segmentu (nie cytat prawdziwej osoby)", "mainArgument": "główny zarzut albo główny powód poparcia", "uncertainty": "niska" | "srednia" | "wysoka"}
  ]
}
Zwróć wpis dla KAŻDEGO z ${AUDIENCE_SEGMENTS.length} segmentów z listy, w tej samej kolejności.`;
}

// ── Stage: opponents (Opponent Room) ─────────────────────────────────
export function buildOpponentsPrompt(input: SimulationInput, localScan: LocalScanResult): string {
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

Zadanie: zasymuluj, jak politycznie zróżnicowani przeciwnicy zaatakują ten komunikat, z siedmiu różnych kierunków ataku.

Zwróć JSON:
{
  "opponentAttacks": [
    {"vector": "lewica" | "prawica" | "liberalny" | "populistyczny" | "ekspercki" | "personalny" | "memiczny", "from": "opisowe określenie atakującego, bez realnych nazwisk", "attack": "konkretna linia ataku, jedno-dwa zdania", "severity": liczba 0-100}
  ]
}
Podaj dokładnie 7 pozycji, po jednej na każdy wektor ataku z listy powyżej, w tej kolejności.`;
}

// ── Stage: media (Media Room + eskalacja) ────────────────────────────
export function buildMediaPrompt(input: SimulationInput, localScan: LocalScanResult): string {
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

Zadanie 1: zasymuluj, jak osiem różnych typów mediów opisze ten komunikat.
Kategorie: przychylne, wrogie, neutralne, tabloidy, lokalne, tv_informacyjne, fact_checkerzy, konta_x.

Zadanie 2: zbuduj oś eskalacji tematu w czasie (8 etapów, od publikacji do ryzyka powrotu tematu).

Zwróć JSON:
{
  "mediaFrames": [
    {"category": "przychylne" | "wrogie" | "neutralne" | "tabloidy" | "lokalne" | "tv_informacyjne" | "fact_checkerzy" | "konta_x", "likelyHeadline": "prawdopodobny tytuł", "extractedQuote": "cytat, który zostanie wyciągnięty z draftu", "frame": "rama interpretacyjna w kilku słowach", "riskLevel": "niskie" | "srednie" | "wysokie", "lifespan": "kilka godzin" | "24h" | "48h" | "tydzień"}
  ],
  "escalationTimeline": [
    {"stage": 1, "label": "Publikacja / wypowiedź", "window": "0–1h", "whatHappens": "...", "whoAmplifies": "...", "counterMeasure": "...", "intensity": liczba 0-100},
    {"stage": 2, "label": "Pierwsze konta polityczne", "window": "1–3h", ...},
    {"stage": 3, "label": "Dziennikarze i komentatorzy", "window": "3–8h", ...},
    {"stage": 4, "label": "Portale", "window": "8–24h", ...},
    {"stage": 5, "label": "Telewizja", "window": "24–48h", ...},
    {"stage": 6, "label": "Memy / TikTok", "window": "24–48h", ...},
    {"stage": 7, "label": "Reakcja przeciwnika", "window": "48h+", ...},
    {"stage": 8, "label": "Doprecyzowanie / przeprosiny / kontratak", "window": "48h+", ...}
  ]
}
Podaj dokładnie 8 pozycji w mediaFrames (po jednej na kategorię, w podanej kolejności) i dokładnie 8 etapów w escalationTimeline (zachowaj podane etykiety i okna czasowe, wypełnij tylko whatHappens/whoAmplifies/counterMeasure/intensity dla treści tego konkretnego draftu).`;
}

// ── Stage: rewrite (Rewrite Room) ────────────────────────────────────
export function buildRewritePrompt(input: SimulationInput, localScan: LocalScanResult): string {
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

Zadanie: napisz 5 alternatywnych wersji tego komunikatu, każda w innym stylu, każda realizująca ten sam cel komunikacyjny, ale z innym rozłożeniem ryzyka.

Zwróć JSON:
{
  "counterfactualVariants": [
    {"type": "bezpieczna", "label": "Wersja bezpieczna", "text": "pełny tekst wariantu", "scores": {"attackRisk": 0-100, "clarity": 0-100, "mobilizationPotential": 0-100, "mediaPotential": 0-100, "memeRisk": 0-100, "goalFit": 0-100}},
    {"type": "empatyczna", "label": "Wersja empatyczna", "text": "...", "scores": {...}},
    {"type": "ofensywna", "label": "Wersja ofensywna", "text": "...", "scores": {...}},
    {"type": "technokratyczna", "label": "Wersja technokratyczna", "text": "...", "scores": {...}},
    {"type": "social", "label": "Wersja pod social media", "text": "...", "scores": {...}}
  ],
  "recommendedVariantType": "bezpieczna" | "empatyczna" | "ofensywna" | "technokratyczna" | "social"
}
Wszystkie scory to liczby 0-100, gdzie dla attackRisk i memeRisk niższa wartość jest lepsza, a dla pozostałych wyższa jest lepsza. recommendedVariantType wskaż uwzględniając podany cel komunikacyjny i poziom akceptowalnego ryzyka nadawcy.`;
}

// ── Stage: final (Final Recommendation) ──────────────────────────────
// Dostaje skondensowany digest wyników poprzednich etapów (nie surowe
// obiekty — żeby nie rozdmuchiwać promptu), scala je w jeden werdykt.
export function buildFinalPrompt(input: SimulationInput, localScan: LocalScanResult, digest: string): string {
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

Poniżej skrót wyników poprzednich etapów analizy (segmenty, przeciwnicy, media, warianty przepisania, red flags):
${digest}

Zadanie: scal to w jeden werdykt strategiczny.

Zwróć JSON:
{
  "verdict": "publikowac" | "publikowac_po_poprawkach" | "wysokie_ryzyko" | "nie_publikowac" | "potencjal_ofensywny_wymaga_oslony",
  "summary": "jedno mocne zdanie podsumowujące werdykt, konkretne, bez lania wody",
  "overallScores": {"mobilizationPotential": 0-100, "crisisRisk": 0-100, "outOfContextVulnerability": 0-100, "clarity": 0-100, "memeRisk": 0-100, "mediaPotential": 0-100, "centerCost": 0-100, "ownBaseGain": 0-100},
  "strategicRecommendation": {
    "action": "atak" | "empatia" | "fakty" | "ironia" | "przeprosiny" | "milczenie" | "zmiana_tematu",
    "whatToDo": "co konkretnie zrobić",
    "whatToAvoid": "czego unikać",
    "mustSaySentence": "jedno zdanie, które musi paść",
    "killerSentence": "które zdanie z oryginalnego draftu jest najbardziej niebezpieczne (zacytuj fragment albo napisz 'brak' jeśli żadne nie wyróżnia się szczególnie)",
    "saverSentence": "jedno zdanie, które naprawiłoby komunikat, gdyby dodać je do draftu",
    "firstCounterResponse": "jaka powinna być pierwsza odpowiedź na atak",
    "backupStatement": "krótki plan B na wypadek eskalacji",
    "whatToMonitor": ["co monitorować po publikacji", "..."],
    "whenToReactAgain": "kiedy reagować ponownie"
  },
  "silenceTest": {
    "isResponseNeeded": true | false,
    "wouldResponseAmplify": true | false,
    "isSilenceSafer": true | false,
    "whenToReturn": "kiedy ewentualnie wrócić z komunikatem",
    "recommendedChannel": "brak reakcji" | "rzecznik" | "ekspert" | "przyjazne media" | "osobiście",
    "reasoning": "krótkie uzasadnienie"
  },
  "uncertaintyLevel": "niska" | "srednia" | "wysoka",
  "aiConfidenceNotes": "jedno-dwa zdania: na czym oparto tę ocenę",
  "dataLimitations": ["czego system nie wie / nie ma dostępu do realnych danych o", "..."]
}
W dataLimitations wprost wymień, że to analiza bez realnego social listeningu, bez sondaży i bez danych o faktycznym zasięgu (bo tekst jeszcze nie został opublikowany) — to prawda o systemie, nie tylko formalność.`;
}

// Krótka etykieta archetypów kryzysu, użyta w promptach jako kontekst
// referencyjny (nie wysyłana wprost, ale trzymana blisko promptów, żeby
// dało się ją łatwo dołączyć przy kolejnej iteracji).
export const KNOWN_CRISIS_ARCHETYPES = CRISIS_ARCHETYPES;
