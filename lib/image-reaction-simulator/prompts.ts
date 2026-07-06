import { ALL_ATTACK_VECTORS, ALL_CAPTION_TYPES, ALL_VISUAL_RISK_FACTORS, EVOLUTION_WINDOWS, IMAGE_AUDIENCE_SEGMENTS, OPPONENT_VECTOR_LABELS, VISUAL_RISK_FACTOR_LABELS } from "./mock-data";
import type { PrecedentCandidate } from "./visual-precedents";
import type { ImageLocalScanResult, ImageObservation, ImageSimulationInput } from "./types";

// ── Biblioteka promptów — Political Image Reaction Simulator ─────────
// Ten sam wzorzec co lib/reaction-simulator/prompts.ts: każdy krok to
// osobna, wyspecjalizowana funkcja, nie jeden mega-prompt. SHARED_RULES
// wymusza rozdział "co faktycznie widać" (krok 2, neutralne) od "co to
// znaczy politycznie" (kroki 3+) — to kluczowe rozróżnienie ze
// specyfikacji ("najpierw fakty wizualne, potem interpretacja").

const SHARED_RULES = `Zasady, których musisz przestrzegać zawsze:
- Jesteś zespołem doradców politycznych grających rolę adwokata diabła, testujących zdjęcie PRZED publikacją.
- Nie zakładaj z góry partii ani tożsamości osoby na zdjęciu — wnioskuj wyłącznie z tego, co widać, i z podanego kontekstu.
- Nie wymyślaj prawdziwych nazwisk dziennikarzy, prawdziwych cytatów ani nieistniejących wydarzeń. Mów ogólnie: "dziennikarz portalu ogólnopolskiego", "komentator sprzyjający opozycji", "konto memiczne" — nigdy o rzeczywistych, nazwanych osobach.
- To jest HIPOTEZA sztucznej inteligencji, nie dane z monitoringu ani realny sondaż — pisz stanowczo i konkretnie, ale to ma być scenariusz, nie fakt.
- Bądź konkretny i bezlitosny. To ma pomóc przed publikacją, nie pocieszyć po fakcie.
- Zwracaj WYŁĄCZNIE czysty JSON, bez markdown, bez bloków kodu, bez komentarzy przed lub po.`;

function contextBlock(input: ImageSimulationInput, localScan: ImageLocalScanResult): string {
  const lines = [
    input.who && `Kto jest na zdjęciu: ${input.who}`,
    input.additionalContext && `Kontekst i intencja podane przez nadawcę: ${input.additionalContext.slice(0, 1500)}`,
    input.topic && `Temat publikacji: ${input.topic}`,
    input.channel && `Kanał publikacji: ${input.channel}`,
    input.goal && `Cel komunikacyjny: ${input.goal}`,
    input.eventType && `Typ wydarzenia: ${input.eventType}`,
    input.isCrisisResponse && "To zdjęcie jest reakcją na kryzys.",
    input.isCounterAttack && "Zdjęcie ma kontratakować przeciwnika.",
    `Akceptowalny poziom ryzyka nadawcy: ${input.riskTolerance}`,
    `Lokalny skan techniczny (deterministyczny, bez AI): format ${localScan.format}, ${localScan.width}×${localScan.height}px (${localScan.aspectRatioLabel}), ${localScan.megapixels}MP${localScan.isHighRes ? "" : ", rozdzielczość poniżej rekomendowanej"}.`,
    localScan.warnings.length > 0 ? `Ostrzeżenia techniczne: ${localScan.warnings.join(" ")}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}

function observationBlock(observation: ImageObservation): string {
  return `Neutralna obserwacja wizualna zdjęcia (już wykonana w poprzednim kroku, bez interpretacji politycznej):
${JSON.stringify(observation, null, 0)}`;
}

// ── Krok 2: Vision Observation ────────────────────────────────────────
// JEDYNY prompt, który dostaje obraz (inlineData) — patrz ai-provider.ts.
// Neutralny opis: fakty wizualne, zero oceny politycznej.
export function buildObservationPrompt(input: ImageSimulationInput, localScan: ImageLocalScanResult): string {
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

Zadanie: opisz NEUTRALNIE, bez żadnej interpretacji politycznej, co faktycznie widać na tym zdjęciu. Najpierw fakty, potem (w kolejnych krokach) ocena.

Zwróć JSON:
{
  "mainSubject": "główny obiekt/osoba na zdjęciu",
  "peopleCount": liczba osób widocznych na zdjęciu,
  "scene": "opis sceny/miejsca",
  "facialExpression": "mimika głównej osoby",
  "pose": "poza ciała",
  "gesture": "gest, jeśli widoczny",
  "background": "opis tła",
  "props": ["rekwizyty widoczne na zdjęciu"],
  "composition": "opis kompozycji kadru",
  "spatialRelations": "relacje przestrzenne między osobami/obiektami",
  "emotion": "dominująca emocja widoczna na zdjęciu",
  "lightingQuality": "jakość i charakter światła",
  "looksNatural": true | false,
  "looksStaged": true | false,
  "notableRiskyElements": ["elementy, które mogą być odczytane niekorzystnie — jeszcze bez interpretacji, tylko wskazanie CO to jest"],
  "rawDescription": "pełny, neutralny opis w 3-5 zdaniach"
}`;
}

// ── Krok 3: Visual Risk Analysis ──────────────────────────────────────
export function buildRiskPrompt(input: ImageSimulationInput, localScan: ImageLocalScanResult, observation: ImageObservation): string {
  const factorList = ALL_VISUAL_RISK_FACTORS.map((f) => `"${f}" (${VISUAL_RISK_FACTOR_LABELS[f]})`).join(", ");
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

${observationBlock(observation)}

Zadanie: oceń ryzyka wizualne zdjęcia oraz wskaż hotspoty ryzyka/atutów na kadrze.

Zwróć JSON:
{
  "visualRiskFactors": [
    {"factor": "jedna z wartości: ${factorList}", "score": 0-100, "reason": "dlaczego, w odniesieniu do konkretnego elementu obserwacji"}
  ],
  "riskHotspots": [
    {"label": "krótka nazwa elementu", "x": 0-100 (pozycja pozioma na kadrze w %), "y": 0-100 (pozycja pionowa w %), "kind": "ryzyko" | "atut", "note": "dlaczego to tu jest zaznaczone"}
  ]
}
Podaj WSZYSTKIE ${ALL_VISUAL_RISK_FACTORS.length} pozycje w visualRiskFactors (jedną na każdy czynnik z listy, w podanej kolejności) oraz 3-6 pozycji w riskHotspots (mieszaj ryzyka i atuty, jeśli są). Współrzędne x/y szacuj na podstawie opisu kompozycji — to przybliżenie, nie precyzyjny bounding box.`;
}

// ── Krok 4: Meme Potential Analysis ───────────────────────────────────
export function buildMemePrompt(input: ImageSimulationInput, localScan: ImageLocalScanResult, observation: ImageObservation): string {
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

${observationBlock(observation)}

Zadanie: oceń potencjał memiczny tego zdjęcia jak najbardziej złośliwy internetowy redaktor memów.

Zwróć JSON:
{
  "memePotential": {
    "isMemeable": true | false,
    "score": 0-100,
    "mostMemeableElement": "który element zdjęcia jest najbardziej memiczny",
    "possibleCaptions": ["3-5 możliwych podpisów pod mema, realistycznie brzmiących"],
    "tones": ["podzbiór: ironiczny, agresywny, klasowy, obyczajowy, pokoleniowy, antyelitarny, antysystemowy"],
    "viralPotential": "pozytywny" | "negatywny" | "oba" | "niski",
    "canMainstream": true | false,
    "defenseAdvice": "jak bronić się przed memizacją — konkretna rada",
    "canCaptionDisarm": true | false
  },
  "memeScenarios": [
    {"format": "np. reaction template / porównanie / cytat z kontekstu / format 'oczekiwania vs rzeczywistość'", "caption": "przykładowy tekst mema", "tone": "jedna z wartości z listy tones powyżej", "riskLevel": "niskie" | "srednie" | "wysokie"}
  ]
}
Podaj 4-6 pozycji w memeScenarios, różnorodnych formatowo.`;
}

// ── Krok: Historical Precedent — "reakcje historyczne na podobne zdjęcia" ─
// KRYTYCZNE dla zasady "zero halucynacji" tego projektu: kandydaci
// (candidates) to WZORCE OGÓLNE z lib/image-reaction-simulator/visual-precedents.ts,
// dopasowane lokalnie i deterministycznie — nie zmyślone przez model.
// Zadanie modelu to WYBRAĆ i UZASADNIĆ dopasowanie do TEGO zdjęcia, nie
// wymyślać nowe, niepotwierdzone "historyczne przypadki".
export function buildHistoricalPrecedentPrompt(
  input: ImageSimulationInput, localScan: ImageLocalScanResult, observation: ImageObservation, candidates: PrecedentCandidate[]
): string {
  const candidateList = candidates.map((c) => `- "${c.archetypeId}" (${c.label}): ${c.typicalPattern} Zwykły przebieg: ${c.typicalOutcome}`).join("\n");
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

${observationBlock(observation)}

Poniżej lista OGÓLNYCH wzorców wizualnych dopasowanych lokalnie (deterministycznie, po słowach kluczowych) do tego zdjęcia — to nie są konkretne, zweryfikowane zdarzenia historyczne, tylko nazwane, powtarzalne wzorce z polityki wizualnej:
${candidateList || "(brak silnych dopasowań lokalnych — oceń samodzielnie na podstawie obserwacji, czy któryś ogólny wzorzec pasuje)"}

Zadanie: dla każdego wzorca, który TWOIM ZDANIEM realnie pasuje do TEGO zdjęcia, wyjaśnij dlaczego — konkretnie, odwołując się do elementów z obserwacji wizualnej (nie ogólnikowo). Odrzuć wzorce, które nie pasują.

ZASADA KRYTYCZNA: NIE WYMYŚLAJ konkretnych, nazwanych zdarzeń historycznych, dat, nazwisk polityków ani źródeł. Opisuj WZORZEC (typ sytuacji, który wielokrotnie się powtarzał w polityce), a nie rzekomy konkretny przypadek. Jeśli chcesz odwołać się do bardzo znanego, powszechnie rozpoznawalnego przykładu (bez wymyślania szczegółów) — zaznacz to wprost jako "ogólnie znany przykład", nigdy jako zweryfikowane źródło.

Zwróć JSON:
{
  "visualPrecedents": [
    {"archetypeId": "dokładnie taki sam identyfikator jak w liście kandydatów powyżej", "matchStrength": 0-100, "whySimilar": "konkretnie, dlaczego TO zdjęcie pasuje do tego wzorca", "typicalPattern": "przepisz albo doprecyzuj opis wzorca", "typicalOutcome": "przepisz albo doprecyzuj typowy przebieg", "historicalNote": "jawne zastrzeżenie, np. 'wzorzec ogólny, nie konkretny udokumentowany przypadek' albo, jeśli faktycznie nawiązujesz do bardzo znanego przykładu, 'nawiązanie do ogólnie znanego, publicznego przykładu, bez weryfikacji źródłowej'"}
  ]
}
Podaj od 0 do 5 pozycji (tylko te, które faktycznie pasują — pusta tablica jest poprawną odpowiedzią, jeśli żaden wzorzec nie pasuje).`;
}

// ── Krok 5: Segment Simulation ────────────────────────────────────────
export function buildSegmentsPrompt(input: ImageSimulationInput, localScan: ImageLocalScanResult, observation: ImageObservation): string {
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

${observationBlock(observation)}

Zadanie: zasymuluj reakcję każdego z podanych segmentów odbiorców na TO ZDJĘCIE (nie na tekst — na wizualny odbiór).
Segmenty: ${IMAGE_AUDIENCE_SEGMENTS.join(", ")}.

Zwróć JSON:
{
  "segmentReactions": [
    {"segment": "dokładna nazwa z listy", "emotion": "dominująca emocja po polsku", "interpretation": "jak ten segment odczyta zdjęcie, jedno zdanie", "acceptance": 0-100, "risk": 0-100, "likelyComment": "realistycznie brzmiący komentarz jakby napisany przez kogoś z tego segmentu (nie cytat prawdziwej osoby)", "strengthensOrWeakens": "wzmacnia" | "oslabia" | "neutralne", "improvementTip": "jak poprawić odbiór u tego segmentu"}
  ]
}
Zwróć wpis dla KAŻDEGO z ${IMAGE_AUDIENCE_SEGMENTS.length} segmentów z listy, w tej samej kolejności.`;
}

// ── Krok 6: Opponent Room ─────────────────────────────────────────────
export function buildOpponentsPrompt(input: ImageSimulationInput, localScan: ImageLocalScanResult, observation: ImageObservation): string {
  const vectorList = ALL_ATTACK_VECTORS.map((v) => `"${v}" (${OPPONENT_VECTOR_LABELS[v]})`).join(", ");
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

${observationBlock(observation)}

Zadanie: zasymuluj, jak politycznie zróżnicowani przeciwnicy zaatakują TO ZDJĘCIE, z ${ALL_ATTACK_VECTORS.length} różnych kierunków ataku.
Wektory: ${vectorList}.

Zwróć JSON:
{
  "opponentAttacks": [
    {"vector": "jedna z wartości z listy powyżej", "from": "opisowe określenie atakującego, bez realnych nazwisk", "attack": "konkretna linia ataku wykorzystująca konkretny element zdjęcia, jedno-dwa zdania", "severity": 0-100}
  ]
}
Podaj dokładnie ${ALL_ATTACK_VECTORS.length} pozycji, po jednej na każdy wektor z listy, w tej kolejności.`;
}

// ── Krok 7: Media Room ────────────────────────────────────────────────
export function buildMediaPrompt(input: ImageSimulationInput, localScan: ImageLocalScanResult, observation: ImageObservation): string {
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

${observationBlock(observation)}

Zadanie: zasymuluj, jak osiem różnych typów mediów wykorzysta i opisze to zdjęcie.
Kategorie: przychylne, wrogie, neutralne, tabloidy, lokalne, tv_informacyjne, fact_checkerzy, konta_x.

Zwróć JSON:
{
  "mediaFrames": [
    {"category": "przychylne" | "wrogie" | "neutralne" | "tabloidy" | "lokalne" | "tv_informacyjne" | "fact_checkerzy" | "konta_x", "agencyCaption": "prawdopodobny podpis agencyjny pod zdjęciem", "portalHeadline": "tytuł artykułu portalu, który użyje tego zdjęcia", "tvChyron": "pasek telewizyjny towarzyszący", "lead": "lead artykułu", "columnistComment": "komentarz publicysty", "negativeUseRisk": "niskie" | "srednie" | "wysokie", "illustratesBiggerNarrative": true | false}
  ]
}
Podaj dokładnie 8 pozycji, po jednej na kategorię, w podanej kolejności.`;
}

// ── Krok 8: Caption Room ──────────────────────────────────────────────
export function buildCaptionPrompt(input: ImageSimulationInput, localScan: ImageLocalScanResult, observation: ImageObservation): string {
  const typeList = ALL_CAPTION_TYPES.join(", ");
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

${observationBlock(observation)}

Zadanie 1: napisz i oceń ${ALL_CAPTION_TYPES.length} wariantów podpisu pod tym zdjęciem.
Typy: ${typeList}.

Zadanie 2: wskaż, czego w podpisie NIE pisać.

Zwróć JSON:
{
  "captionRecommendations": [
    {"type": "jedna z wartości z listy typów", "label": "krótka etykieta po polsku", "text": "pełny tekst podpisu", "risk": 0-100, "tone": "ton podpisu", "strengthensImage": true | false, "disarmsRisk": true | false, "mayCreateNewProblem": true | false}
  ],
  "captionRisks": [
    {"avoid": "fraza albo pomysł, którego unikać w podpisie", "why": "dlaczego to ryzykowne"}
  ]
}
Podaj dokładnie ${ALL_CAPTION_TYPES.length} pozycji w captionRecommendations (po jednej na typ, w podanej kolejności) i 3-5 pozycji w captionRisks.`;
}

// ── Krok 9: Image Evolution Timeline ──────────────────────────────────
export function buildEvolutionPrompt(input: ImageSimulationInput, localScan: ImageLocalScanResult, observation: ImageObservation): string {
  const windows = EVOLUTION_WINDOWS.map((w, i) => `${i + 1}. ${w.window} — ${w.label}`).join("\n");
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

${observationBlock(observation)}

Zadanie: zaprognozuj ewolucję odbioru tego zdjęcia w czasie, w podanych oknach:
${windows}

Zwróć JSON:
{
  "evolutionTimeline": [
    {"window": "0–1h", "label": "Pierwsze komentarze", "whatMayHappen": "...", "whoAmplifies": "...", "likelyComment": "...", "howToReact": "...", "whatNotToDo": "...", "intensity": 0-100},
    {"window": "1–3h", "label": "Reakcje kont politycznych", ...},
    {"window": "3–8h", "label": "Możliwe wejście portali", ...},
    {"window": "8–24h", "label": "Memizacja / komentarze publicystów", ...},
    {"window": "24–48h", "label": "Utrwalenie albo wygaszenie", ...},
    {"window": "48h+", "label": "Czy zdjęcie może wracać jako symbol", ...}
  ]
}
Zachowaj podane etykiety i okna czasowe w tej kolejności, wypełnij treść dla tego konkretnego zdjęcia i kontekstu.`;
}

// ── Krok 10: Final Strategic Recommendation ───────────────────────────
// Dostaje skondensowany digest wyników poprzednich etapów, nie surowe
// obiekty — analogicznie do buildFinalPrompt w module tekstowym.
export function buildFinalPrompt(input: ImageSimulationInput, localScan: ImageLocalScanResult, observation: ImageObservation, digest: string): string {
  return `${SHARED_RULES}

${contextBlock(input, localScan)}

${observationBlock(observation)}

Poniżej skrót wyników poprzednich etapów analizy (ryzyka wizualne, memiczność, segmenty, przeciwnicy, media, podpisy, ewolucja):
${digest}

Zadanie: scal to w jeden werdykt strategiczny — odpowiedz wprost, czy publikować.

Zwróć JSON:
{
  "verdict": "publikowac" | "publikowac_po_poprawkach" | "wysokie_ryzyko" | "nie_publikowac" | "publikowac_z_oslona" | "dobry_kadr_zly_kontekst" | "potencjal_ale_memizacja" | "lepsze_wewnetrznie",
  "summary": "jedno mocne zdanie podsumowujące werdykt, konkretne, bez lania wody",
  "recommendedAction": "jedno zdanie z konkretną, natychmiast czytelną rekomendacją działania",
  "overallScores": {"authenticity": 0-100, "empathy": 0-100, "agency": 0-100, "strengthAuthority": 0-100, "closenessToPeople": 0-100, "memeRisk": 0-100, "arroganceRisk": 0-100, "artificialityRisk": 0-100, "outOfContextRisk": 0-100, "viralPotential": 0-100, "centerCost": 0-100, "ownBaseGain": 0-100, "channelFit": 0-100},
  "cropRecommendations": [
    {"type": "crop" | "alternatywne_zdjecie" | "seria_zdjec" | "bez_zmian", "description": "co konkretnie zrobić", "reason": "dlaczego"}
  ],
  "alternativeUseRecommendations": [
    {"useCase": "np. materiał wewnętrzny / newsletter zamiast social", "description": "dlaczego to lepsze miejsce dla tego zdjęcia"}
  ],
  "strategicRecommendation": {
    "channel": "rekomendowany kanał publikacji",
    "caption": "rekomendowany podpis (krótki)",
    "crop": "rekomendowany crop/kadr",
    "needsRetouch": true | false,
    "needsDifferentImage": true | false,
    "needsSeries": true | false,
    "needsTextualCover": true | false,
    "biggestVisualProblem": "największy problem wizualny",
    "biggestVisualAsset": "największy atut wizualny",
    "firstCounterAttack": "pierwszy kontratak na najbardziej prawdopodobną negatywną interpretację"
  },
  "uncertaintyLevel": "niska" | "srednia" | "wysoka",
  "aiConfidenceNotes": "jedno-dwa zdania: na czym oparto tę ocenę",
  "dataLimitations": ["czego system nie wie / nie ma dostępu do", "..."]
}
W dataLimitations wprost wymień, że to analiza jednego statycznego zdjęcia bez realnego social listeningu, bez testów A/B i bez danych o faktycznym zasięgu (bo zdjęcie jeszcze nie zostało opublikowane), oraz że hotspoty ryzyka to przybliżenie modelu, nie precyzyjne współrzędne.`;
}
