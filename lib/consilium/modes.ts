import type { ConsiliumMode } from "./types";

// ── Tryby pracy Konsylium ───────────────────────────────────────────────
// Tryb nie zmienia listy ekspertów (zawsze naradza się wszystkich 10 —
// to jest sens "konsylium"), tylko przestawia akcenty analizy: które
// pytania są priorytetowe, jak ma wyglądać finalna rekomendacja i jaki
// ton ma przyjąć synteza. focusExperts wskazuje, czyje stanowisko synteza
// powinna traktować jako wiodące przy rozstrzyganiu sporów (patrz
// disagreementProtocol), reszta ekspertów nadal analizuje temat w pełni.

export interface ConsiliumModeConfig {
  id: ConsiliumMode;
  label: string;
  shortDescription: string;
  focusExperts: string[]; // ExpertId[], ale luźno typowane żeby uniknąć cyklicznego importu
  synthesisEmphasis: string; // wstrzykiwane do promptu syntezy
  topicPlaceholder: string;
  contextPlaceholder: string;
}

export const CONSILIUM_MODES: ConsiliumModeConfig[] = [
  {
    id: "strategia",
    label: "Strategia polityczna",
    shortDescription: "Ogólna ocena tematu, kierunku działania i pozycjonowania.",
    focusExperts: ["strateg", "socjolog", "narracja"],
    synthesisEmphasis:
      "Tryb strategiczny: priorytetem jest długofalowa pozycja polityczna, nie doraźna reakcja. Finalna rekomendacja ma wskazywać kierunek działania (zaangażować się / obserwować / unikać) i jego uzasadnienie w kategoriach interesu politycznego oraz odbioru społecznego.",
    topicPlaceholder: "Np. Czy polityk powinien poprzeć zakaz sprzedaży alkoholu na stacjach benzynowych po 22:00?",
    contextPlaceholder: "Sytuacja polityczna, otoczenie, aktualny etap kadencji, konkurencja na temacie…",
  },
  {
    id: "kryzys",
    label: "Zarządzanie kryzysowe",
    shortDescription: "Szybka reakcja na sytuację kryzysową, presja czasu.",
    focusExperts: ["spin_doctor", "red_team", "prawnik"],
    synthesisEmphasis:
      "Tryb kryzysowy: liczy się szybkość i kontrola szkód, nie idealna narracja. Finalna rekomendacja ma być gotowa do wdrożenia w ciągu godzin, z jasnym podziałem na działania natychmiastowe i działania odroczone. Wskaż wprost, co powstrzymać, zanim zacznie się eskalować.",
    topicPlaceholder: "Np. Wyciekło nagranie z zamkniętego spotkania klubu, treść jest niejednoznaczna.",
    contextPlaceholder: "Co już wiadomo, co już wyciekło do mediów, ile jest czasu do reakcji…",
  },
  {
    id: "wypowiedz_medialna",
    label: "Wypowiedź medialna",
    shortDescription: "Ocena lub przygotowanie konkretnej wypowiedzi, cytatu, wystąpienia.",
    focusExperts: ["narracja", "spin_doctor", "fact_checker"],
    synthesisEmphasis:
      "Tryb wypowiedzi medialnej: analizuj konkretne sformułowania, nie tylko temat ogólnie. Finalna rekomendacja ma zawierać gotowe do wypowiedzenia zdania (messageLines) i wyraźnie oznaczone sformułowania do unikania, ze wskazaniem dlaczego dany zwrot jest ryzykowny.",
    topicPlaceholder: "Np. Projekt odpowiedzi polityka na pytanie dziennikarza o podwyżki dla urzędników.",
    contextPlaceholder: "Gdzie i przed kim pada wypowiedź, jaki jest wcześniejszy kontekst pytania…",
  },
  {
    id: "projekt_ustawy",
    label: "Projekt ustawy / regulacji",
    shortDescription: "Ocena propozycji legislacyjnej pod kątem treści i komunikacji.",
    focusExperts: ["prawnik", "ekonomista", "fact_checker"],
    synthesisEmphasis:
      "Tryb legislacyjny: rozdziel wyraźnie ocenę wykonalności prawnej i kosztowej od oceny komunikacyjnej. Finalna rekomendacja ma wskazać, czy projekt w obecnym kształcie jest broniony merytorycznie, oraz jakie poprawki obniżą ryzyko polityczne bez zmiany sensu regulacji.",
    topicPlaceholder: "Np. Projekt ustawy wprowadzającej dodatkowy dzień wolny od pracy w listopadzie.",
    contextPlaceholder: "Etap procesu legislacyjnego, kto jest wnioskodawcą, jaka jest opozycja wobec projektu…",
  },
  {
    id: "kampania",
    label: "Kampania / komunikacja długofalowa",
    shortDescription: "Planowanie komunikacji rozłożonej w czasie, budowanie tematu.",
    focusExperts: ["strateg", "narracja", "socjolog"],
    synthesisEmphasis:
      "Tryb kampanijny: myśl w horyzoncie tygodni i miesięcy, nie pojedynczej publikacji. Finalna rekomendacja ma wskazać sekwencję działań (co najpierw, co potem) i to, jak temat wzmacnia lub osłabia szerszą narrację kampanii.",
    topicPlaceholder: "Np. Temat mieszkalnictwa jako oś komunikacji na najbliższy kwartał.",
    contextPlaceholder: "Aktualna oś kampanii, główni adresaci, konkurencyjne tematy w przestrzeni publicznej…",
  },
  {
    id: "social_media",
    label: "Social media",
    shortDescription: "Temat rozpatrywany pod kątem publikacji w social mediach.",
    focusExperts: ["social_media", "narracja", "red_team"],
    synthesisEmphasis:
      "Tryb social media: skup się na formacie i platformie, nie na komunikacji ogólnej. Finalna rekomendacja ma wskazać konkretny format (post, rolka, wątek, grafika) i platformę, oraz najbardziej prawdopodobny sposób, w jaki temat zostanie skrócony lub przerobiony przez innych użytkowników.",
    topicPlaceholder: "Np. Krótki post o wynikach głosowania w komisji.",
    contextPlaceholder: "Docelowa platforma, ton konta, wcześniejsze reakcje na podobne posty…",
  },
  {
    id: "debata",
    label: "Przygotowanie do debaty / konfrontacji",
    shortDescription: "Przygotowanie do bezpośredniej konfrontacji: debata, wywiad, komisja.",
    focusExperts: ["red_team", "fact_checker", "psycholog"],
    synthesisEmphasis:
      "Tryb debaty: zakładaj bezpośredni, żywy kontakt z przeciwnikiem lub trudnym pytającym. Finalna rekomendacja ma zawierać przewidywane trudne pytania i ataki wraz z gotowymi liniami obrony, nie tylko ogólną ocenę tematu.",
    topicPlaceholder: "Np. Przygotowanie do debaty na temat polityki mieszkaniowej.",
    contextPlaceholder: "Format starcia, przeciwnik, znane wcześniej ataki na ten temat…",
  },
];

export function getMode(id: ConsiliumMode): ConsiliumModeConfig {
  const found = CONSILIUM_MODES.find((m) => m.id === id);
  if (!found) throw new Error(`Nieznany tryb Konsylium: ${id}`);
  return found;
}
