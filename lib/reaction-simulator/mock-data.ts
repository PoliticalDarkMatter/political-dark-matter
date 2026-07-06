import type { CommFormat, CommSituation, CommunicationGoal, InputMode, PoliticianRole, Topic } from "./types";

// ── Political Reaction Simulator — słowniki i dane referencyjne ──────
// To jest warstwa, którą docelowo zasili prawdziwy social listening,
// Narrative Memory (archiwum przypadków) i Influence Graph — patrz
// komentarze "DOCELOWO" w orchestrator.ts. Na tym etapie to spisana
// wiedza ekspercka (słownik fraz zapalnych, segmenty, archetypy), nie
// wolnostojący mock „na pokaz" — jest realnie używana przez local-scan.ts
// do liczenia scoringu i przez prompty do sterowania modelem językowym.

export const TOPICS: Array<{ value: Topic; label: string }> = [
  { value: "gospodarka", label: "Gospodarka" },
  { value: "migracja", label: "Migracja" },
  { value: "zdrowie", label: "Zdrowie" },
  { value: "edukacja", label: "Edukacja" },
  { value: "bezpieczenstwo", label: "Bezpieczeństwo" },
  { value: "klimat", label: "Klimat" },
  { value: "kosciol", label: "Kościół" },
  { value: "obyczaje", label: "Obyczaje" },
  { value: "wojna", label: "Wojna" },
  { value: "podatki", label: "Podatki" },
  { value: "samorzad", label: "Samorząd" },
  { value: "kryzys", label: "Kryzys" },
];

export const FORMATS: Array<{ value: CommFormat; label: string }> = [
  { value: "tweet_x", label: "Tweet / X" },
  { value: "konferencja", label: "Konferencja prasowa" },
  { value: "wywiad_tv", label: "Wywiad TV" },
  { value: "tiktok", label: "TikTok" },
  { value: "sejm", label: "Wystąpienie sejmowe" },
  { value: "facebook", label: "Facebook" },
  { value: "oswiadczenie", label: "Oświadczenie" },
  { value: "briefing", label: "Briefing" },
  { value: "debata", label: "Debata" },
];

export const SITUATIONS: Array<{ value: CommSituation; label: string }> = [
  { value: "atak", label: "Atak" },
  { value: "obrona", label: "Obrona" },
  { value: "przeprosiny", label: "Przeprosiny" },
  { value: "wyjasnienie", label: "Wyjaśnienie" },
  { value: "ofensywa", label: "Ofensywa" },
  { value: "mobilizacja_wlasnych", label: "Mobilizacja własnych" },
  { value: "neutralizacja_kryzysu", label: "Neutralizacja kryzysu" },
];

export const ROLES: Array<{ value: PoliticianRole; label: string }> = [
  { value: "lider", label: "Lider" },
  { value: "minister", label: "Minister" },
  { value: "posel", label: "Poseł" },
  { value: "kandydat", label: "Kandydat" },
  { value: "rzecznik", label: "Rzecznik" },
  { value: "samorzadowiec", label: "Samorządowiec" },
];

export const GOALS: Array<{ value: CommunicationGoal; label: string }> = [
  { value: "mobilizacja_wlasnych", label: "Mobilizować własnych" },
  { value: "przekonanie_centrum", label: "Przekonać centrum" },
  { value: "neutralizacja_kryzysu", label: "Zneutralizować kryzys" },
  { value: "atak_na_przeciwnika", label: "Zaatakować przeciwnika" },
  { value: "odwrocenie_uwagi", label: "Odwrócić uwagę" },
  { value: "przejecie_tematu", label: "Przejąć temat" },
  { value: "obnizenie_temperatury", label: "Obniżyć temperaturę" },
  { value: "wymuszenie_reakcji_mediow", label: "Wymusić reakcję mediów" },
  { value: "kontrast_moralny", label: "Zbudować kontrast moralny" },
  { value: "pokazanie_sprawczosci", label: "Pokazać sprawczość" },
];

export const TARGET_AUDIENCES: string[] = [
  "własny elektorat", "centrum", "młodzi", "seniorzy", "kobiety 35–55",
  "małe miasta", "wielkie miasta", "przedsiębiorcy", "pracownicy budżetówki", "rolnicy",
];

// Grupy używane w symulacji segmentów (Krok 3 / SegmentHeatmap)
export const AUDIENCE_SEGMENTS: string[] = [
  "własny elektorat",
  "twardy elektorat przeciwnika",
  "centrum",
  "młodzi",
  "seniorzy",
  "kobiety 35–55",
  "małe miasta",
  "duże miasta",
  "dziennikarze polityczni",
  "komentatorzy TV",
  "TikTok",
  "X/Twitter",
  "Facebook",
  "lokalne media",
];

export const CRISIS_ARCHETYPES: string[] = [
  "arogancja elit",
  "oderwanie od życia",
  "atak na zwykłych ludzi",
  "hipokryzja",
  "brak empatii",
  "chaos i niekompetencja",
  "ukryty interes",
  "zagrożenie dla portfeli",
  "wojna kulturowa",
  "technokratyczny bełkot",
  "ucieczka od odpowiedzialności",
  "zrzucanie winy na obywateli",
];

export const REACTION_EMOTIONS: string[] = [
  "aprobata", "oburzenie", "lęk", "drwina", "satysfakcja", "poczucie zdrady",
  "zmęczenie", "obojętność", "nadzieja", "mobilizacja", "cynizm",
];

// ── Słownik fraz zapalnych — podstawa Local Pre-Scan (bez LLM) ──────
// waga: wkład do baseRiskScore (0-100 łącznie, klamrowane); reason:
// pokazywane w TriggerPhraseScanner jako "dlaczego to ryzykowne".
export interface TriggerDictEntry {
  phrase: string;
  weight: number;
  reason: string;
  archetype: string;
}

export const TRIGGER_PHRASE_DICT: TriggerDictEntry[] = [
  { phrase: "histeria", weight: 14, reason: "Deprecjonuje realne obawy jako irracjonalne — łatwy zarzut lekceważenia.", archetype: "arogancja elit" },
  { phrase: "rozdawnictwo", weight: 16, reason: "Rama ekonomiczna odczytywana jako pogarda dla wsparcia socjalnego.", archetype: "atak na zwykłych ludzi" },
  { phrase: "muszą zrozumieć", weight: 12, reason: "Protekcjonalny ton — sugeruje wyższość nadawcy nad odbiorcą.", archetype: "arogancja elit" },
  { phrase: "nie nasza odpowiedzialność", weight: 15, reason: "Klasyczna ucieczka od odpowiedzialności — łatwa rama chaosu.", archetype: "ucieczka od odpowiedzialności" },
  { phrase: "roszczeniowi", weight: 17, reason: "Etykietuje ludzi z realnymi potrzebami jako nieuprawnionych.", archetype: "atak na zwykłych ludzi" },
  { phrase: "elity", weight: 8, reason: "Słowo-wytrych, łatwo odwrócić przeciwko nadawcy.", archetype: "wojna kulturowa" },
  { phrase: "patologia", weight: 13, reason: "Mocne słowo, wymaga dowodu, inaczej brzmi jak stygmatyzacja.", archetype: "wojna kulturowa" },
  { phrase: "normalni ludzie", weight: 11, reason: "Implikuje, że ktoś inny jest nienormalny — dzieli odbiorców.", archetype: "wojna kulturowa" },
  { phrase: "trzeba ich nauczyć", weight: 18, reason: "Skrajnie protekcjonalne — brzmi jak karcenie obywateli.", archetype: "arogancja elit" },
  { phrase: "niech się dostosują", weight: 16, reason: "Brak empatii, przerzuca ciężar zmiany wyłącznie na słabszą stronę.", archetype: "brak empatii" },
  { phrase: "nie będziemy ulegać", weight: 10, reason: "Wojownicze, dobre do mobilizacji, ale łatwe do przedstawienia jako ignorowanie realnych obaw.", archetype: "wojna kulturowa" },
  { phrase: "to nie nasz problem", weight: 15, reason: "Ucieczka od odpowiedzialności w prostej, cytowalnej formie.", archetype: "ucieczka od odpowiedzialności" },
  { phrase: "jeśli ktoś poczuł się urażony", weight: 20, reason: "Pseudo-przeprosiny — przenosi winę na odbiorcę zamiast przyjąć odpowiedzialność.", archetype: "hipokryzja" },
  { phrase: "spokojnie", weight: 6, reason: "W kontekście kryzysu może brzmieć jak lekceważenie powagi sytuacji.", archetype: "brak empatii" },
  { phrase: "eksperci mówią", weight: 5, reason: "Bez konkretów brzmi jak wywoływanie autorytetu bez pokrycia — ryzyko technokratycznego bełkotu.", archetype: "technokratyczny bełkot" },
];

// ── Przykłady demonstracyjne (sekcja 12 specyfikacji) ───────────────
export interface DemoExample {
  id: string;
  label: string;
  text: string;
  topic: Topic;
  situation: CommSituation;
}

export const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: "rozdawnictwo",
    label: "Rozdawnictwo i odpowiedzialność",
    text: "Musimy skończyć z rozdawnictwem i nauczyć ludzi odpowiedzialności.",
    topic: "gospodarka",
    situation: "ofensywa",
  },
  {
    id: "histeria-ekologow",
    label: "Histeria ekologów",
    text: "Nie będziemy ulegać histerii ekologów.",
    topic: "klimat",
    situation: "atak",
  },
  {
    id: "samorzady",
    label: "Nie nasza odpowiedzialność",
    text: "To nie jest nasza odpowiedzialność, tylko samorządów.",
    topic: "kryzys",
    situation: "wyjasnienie",
  },
  {
    id: "pseudo-przeprosiny",
    label: "Pseudo-przeprosiny",
    text: "Przepraszam, jeśli ktoś poczuł się urażony.",
    topic: "kryzys",
    situation: "przeprosiny",
  },
];

export const RISK_TOLERANCE_LABELS: Record<string, string> = {
  niskie: "Niski", srednie: "Średni", wysokie: "Wysoki", zwarcie: "Idziemy na zwarcie",
};

// ── Tryby wprowadzania — etykiety i podpowiedzi dla zakładek InputPanel ─
export const INPUT_MODES: Array<{ value: InputMode; label: string; hint: string; placeholder: string }> = [
  {
    value: "wypowiedz",
    label: "Wypowiedź / cytat",
    hint: "Pojedynczy tekst do przetestowania przed publikacją",
    placeholder: "Wklej planowany tweet, wypowiedź, fragment wywiadu, komunikat, reakcję kryzysową…",
  },
  {
    value: "wydarzenie_planowane",
    label: "Wydarzenie / decyzja (planowane)",
    hint: "Działanie, które jeszcze nie zostało ogłoszone ani wykonane",
    placeholder: "Opisz, co planujecie zrobić albo ogłosić — np. decyzję, wizytę, ruch personalny, zmianę stanowiska…",
  },
  {
    value: "watek",
    label: "Seria wypowiedzi / wątek",
    hint: "Kilka powiązanych wypowiedzi testowanych razem, jako całość",
    placeholder: "Pierwsza wypowiedź w wątku — kolejne dodasz poniżej…",
  },
  {
    value: "wydarzenie_zaistniale",
    label: "Wydarzenie, które już zaistniało",
    hint: "Coś już się wydarzyło albo zostało powiedziane — pytanie brzmi, jak reagować dalej",
    placeholder: "Opisz, co się już wydarzyło albo co zostało powiedziane…",
  },
];
