import type { ImageObservation, VisualRiskFactor, VisualRiskFactorType } from "./types";

// ── Silnik precedensów wizualnych — "reakcje historyczne na podobne
// zdjęcia" (zgłoszenie Jana 2026-07-06) ───────────────────────────────
//
// WAŻNE ograniczenie architektoniczne, zgodne z zasadą projektu "zero
// halucynacji": to NIE jest baza zweryfikowanych, konkretnych zdarzeń
// historycznych (dat, nazwisk, źródeł) — takiej bazy tu nie ma i nie
// wolno jej udawać. Zamiast tego jest to biblioteka OGÓLNYCH, wielokrotnie
// obserwowanych WZORCÓW wizualnych, które politycznie powtarzają się od
// dekad niezależnie od kraju czy partii (np. "symbol luksusu w czasie
// kryzysu", "uśmiech w złym kontekście"). To jest odpowiednik
// CRISIS_ARCHETYPES z modułu tekstowego (lib/reaction-simulator/mock-data.ts)
// — tam też nie ma "bazy prawdziwych afer", tylko nazwane wzorce ryzyka.
//
// Pipeline: (1) to dopasowanie lokalne, deterministyczne, bez LLM —
// tylko kandydaci po słowach kluczowych + korelacji ze scoringiem ryzyka;
// (2) orchestrator.ts przekazuje kandydatów do promptu LLM (patrz
// prompts.ts: buildHistoricalPrecedentPrompt), który wybiera i uzasadnia
// dopasowanie DO TEGO KONKRETNEGO zdjęcia — z twardym zakazem wymyślania
// konkretnych nazwanych zdarzeń/dat/osób (patrz SHARED_RULES + dopisek
// w tym promptcie).
//
// DOCELOWO (nieukończone celowo): realna baza udokumentowanych, ze
// źródłem, historycznych przypadków wymagałaby osobnej infrastruktury
// (np. Bright Data + ręcznie zweryfikowany katalog) — poza zakresem
// tego modułu. Dopóki jej nie ma, system ma jawnie mówić "wzorzec
// ogólny", nie "udokumentowany przypadek" (patrz dataLimitations w
// mock-generators.ts / walidacji finalnego etapu).

export interface VisualPrecedentArchetype {
  id: string;
  label: string;
  cues: string[]; // słowa/frazy do dopasowania (lowercase, PL) w opisie Vision AI
  boostFactors: VisualRiskFactorType[]; // czynniki ryzyka, które podnoszą trafność tego wzorca
  typicalPattern: string;
  typicalOutcome: string;
}

export const VISUAL_PRECEDENT_LIBRARY: VisualPrecedentArchetype[] = [
  {
    id: "luksus_w_kryzysie",
    label: "Symbol luksusu w czasie kryzysu",
    cues: ["zegarek", "jacht", "luksusow", "drogi samoch", "limuzyn", "biznes klas", "willa", "basen"],
    boostFactors: ["elitarnosc", "oderwanie_od_ludzi"],
    typicalPattern: "Widoczny symbol zamożności zestawiony (choćby przypadkowo) z kontekstem trudności ekonomicznych innych ludzi — wielokrotnie powtarzający się w polityce wzorzec, niezależnie od kraju czy partii.",
    typicalOutcome: "Zwykle szybka memizacja, komentarz o 'oderwaniu od rzeczywistości', temat żyje 24-72h i wraca przy kolejnych podobnych okazjach.",
  },
  {
    id: "oderwanie_od_ludzi",
    label: "Dystans i pozycja \"z góry\"",
    cues: ["z gory", "podium", "dystans", "wysoko", "ochrona", "kordon", "bariera", "za szybą", "za szyba"],
    boostFactors: ["oderwanie_od_ludzi", "arogancja"],
    typicalPattern: "Kompozycja podkreślająca hierarchię i fizyczny dystans od zwykłych ludzi zamiast bliskości.",
    typicalOutcome: "Odczytywane jako brak kontaktu z rzeczywistością wyborców, chętnie wykorzystywane przez przeciwników jako kontrast z ich własnymi 'zdjęciami z ludźmi'.",
  },
  {
    id: "usmiech_w_zlym_kontekscie",
    label: "Uśmiech albo śmiech w niewłaściwym kontekście",
    cues: ["usmiech", "śmiech", "smiech", "rozbawiony", "wesoly", "zabawa"],
    boostFactors: ["brak_empatii", "niekorzystna_mimika"],
    typicalPattern: "Pozytywna mimika uchwycona w kontekście, który wymagał powagi (żałoba, katastrofa, kryzys, ofiary).",
    typicalOutcome: "Jeden z najsilniejszych i najszybciej wybuchających wzorców — kadr obiega sieć practycznie natychmiast, trudny do zneutralizowania samym podpisem.",
  },
  {
    id: "ustawka_widoczna",
    label: "Widoczna reżyseria / ustawka",
    cues: ["wyreżyserowan", "wyrezyserowan", "pozowan", "sztuczn", "idealn", "zbyt perfekcyjn", "statysc"],
    boostFactors: ["sztucznosc"],
    typicalPattern: "Zbyt idealna kompozycja, nienaturalne ustawienie ludzi/rekwizytów, widoczne ślady inscenizacji.",
    typicalOutcome: "Rodzi zarzuty 'propagandy' i 'ustawki' niezależnie od faktycznej treści przekazu — samo wrażenie sztuczności podważa wiarygodność.",
  },
  {
    id: "kontrast_klasowy",
    label: "Kontrast klasowy stroju/otoczenia",
    cues: ["garnitur", "krawat", "elegan", "kontrast", "skromn", "biedn", "prosty strój", "prosty str"],
    boostFactors: ["elitarnosc", "oderwanie_od_ludzi"],
    typicalPattern: "Wyraźna różnica między wizualną prezentacją polityka a otoczeniem/ludźmi, z którymi się spotyka.",
    typicalOutcome: "Wykorzystywane jako dowód braku autentycznej bliskości, szczególnie skuteczne w rękach przeciwników populistycznych.",
  },
  {
    id: "gest_niejednoznaczny",
    label: "Gest łatwy do wyrwania z kontekstu",
    cues: ["gest", "wskazuj", "macha", "podnosi reke", "podnosi rękę", "wyciagnieta reka", "wyciągnięta ręka"],
    boostFactors: ["niekorzystny_gest"],
    typicalPattern: "Ułamek sekundy ruchu ciała zamrożony w kadrze w sposób, który w statycznym zdjęciu wygląda inaczej niż w ruchu.",
    typicalOutcome: "Klasyczny materiał na mem lub manipulację — łatwy do podpisania fałszywym kontekstem, bo sam kadr 'broni się słabo'.",
  },
  {
    id: "sielanka_w_kryzysie",
    label: "Sielankowa scena podczas kryzysu",
    cues: ["wakacje", "plaza", "plaża", "urlop", "impreza", "przyjecie", "przyjęcie", "relaks", "grill"],
    boostFactors: ["oderwanie_od_ludzi", "brak_empatii"],
    typicalPattern: "Beztroski, wypoczynkowy kontekst zdjęcia publikowany w momencie, gdy w kraju/regionie trwa kryzys albo żałoba.",
    typicalOutcome: "Bardzo częsty wzorzec kryzysów wizerunkowych — timing okazuje się ważniejszy niż samo zdjęcie.",
  },
  {
    id: "sila_bez_empatii",
    label: "Siła/dominacja bez ludzkiego kontekstu",
    cues: ["dominuj", "gniewn", "surow", "zacisniet", "zaciśnię", "groźn", "grozn", "agresywn"],
    boostFactors: ["agresja", "brak_empatii"],
    typicalPattern: "Poza budująca autorytet i siłę, ale pozbawiona jakiegokolwiek elementu ciepła czy bliskości.",
    typicalOutcome: "Wzmacnia własny twardy elektorat, ale kosztuje u centrum i bywa odczytane jako agresja, nie determinacja.",
  },
  {
    id: "zle_dopasowanie_okazji",
    label: "Niedopasowanie tonu do powagi okazji",
    cues: ["casualow", "sportow", "za formaln", "nieformaln", "niedopasowan"],
    boostFactors: ["sztucznosc", "brak_empatii"],
    typicalPattern: "Strój, poza albo ton zdjęcia nieadekwatny do wagi wydarzenia — zbyt luźny na oficjalną okazję albo odwrotnie.",
    typicalOutcome: "Rodzi komentarze o braku wyczucia sytuacji, zwykle krótkotrwałe, ale wzmacniające istniejące uprzedzenia wobec nadawcy.",
  },
  {
    id: "izolacja_wsrod_wlasnych",
    label: "Sugestia izolacji we własnym środowisku",
    cues: ["puste krzesla", "puste krzesła", "sam", "samotn", "z tylu", "z tyłu", "na uboczu", "bez wsparcia"],
    boostFactors: ["slabosc", "chaos"],
    typicalPattern: "Kompozycja sugerująca brak wsparcia sojuszników albo dystans wewnątrz własnego obozu.",
    typicalOutcome: "Wykorzystywane jako dowód słabnącej pozycji czy konfliktu wewnętrznego, nawet jeśli to przypadek kadrowania.",
  },
  {
    id: "przypadkowy_symbol_w_tle",
    label: "Przypadkowy symbol lub napis w tle",
    cues: ["napis w tle", "logo w tle", "plakat w tle", "baner w tle", "przypadkow"],
    boostFactors: ["przypadkowe_symbole"],
    typicalPattern: "Element w tle (napis, logo, przedmiot), którego obecności nikt nie planował, ale zyskuje własne życie w interpretacjach.",
    typicalOutcome: "Nieprzewidywalny wzorzec — czasem ignorowany, czasem staje się głównym tematem zamiast samego zdjęcia.",
  },
];

export interface PrecedentCandidate {
  archetypeId: string;
  label: string;
  localMatchStrength: number; // 0-100, z dopasowania lokalnego (przed LLM)
  typicalPattern: string;
  typicalOutcome: string;
}

// Dopasowanie lokalne — CANDYDACI dla promptu LLM, nie finalny wynik.
// Łączy dopasowanie słów kluczowych w opisie Vision AI z korelacją do
// już policzonych czynników ryzyka wizualnego (visual_risk stage).
export function matchVisualPrecedents(
  observation: ImageObservation,
  riskFactors: VisualRiskFactor[]
): PrecedentCandidate[] {
  const haystack = [
    observation.background, observation.gesture, observation.facialExpression,
    observation.composition, observation.pose, observation.scene,
    ...(observation.props || []), ...(observation.notableRiskyElements || []),
  ].join(" ").toLowerCase();

  const riskByFactor = new Map(riskFactors.map((f) => [f.factor, f.score]));

  const scored = VISUAL_PRECEDENT_LIBRARY.map((arch) => {
    let score = 0;
    for (const cue of arch.cues) {
      if (haystack.includes(cue)) score += 20;
    }
    for (const factor of arch.boostFactors) {
      const riskScore = riskByFactor.get(factor);
      if (riskScore != null) score += Math.round(riskScore * 0.35);
    }
    return {
      archetypeId: arch.id,
      label: arch.label,
      localMatchStrength: Math.max(0, Math.min(100, score)),
      typicalPattern: arch.typicalPattern,
      typicalOutcome: arch.typicalOutcome,
    };
  });

  // Zawsze zwracamy najlepszych kandydatów (nawet o niskim dopasowaniu) —
  // to i tak tylko kandydaci dla LLM, który zdecyduje, czy są w ogóle
  // adekwatni do TEGO zdjęcia (może odrzucić wszystkie, jeśli żaden nie pasuje).
  return scored.sort((a, b) => b.localMatchStrength - a.localMatchStrength).slice(0, 6);
}
