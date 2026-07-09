import type { ExpertId } from "@/lib/consilium/types";
import type { ApexProduct } from "./types";

// ── Produkty Apex Grid — konfiguracja jako DANE ────────────────────────
// To jest główny plik do przyszłych modyfikacji: zmiana składu narady,
// akcentów analizy, liczby scenariuszy czy tonu decyzji per produkt to
// edycja obiektu tutaj — bez dotykania orchestratora, promptów ani UI.
// Ten sam wzorzec co lib/consilium/modes.ts.
//
// Trzy produkty odpowiadają trzem trybom pracy z dokumentu koncepcyjnego:
//   sdp    → Strategic Decision Package (rytm tygodniowy, pełna głębia)
//   brief  → Brief przeddecyzyjny (przed wywiadem/debatą/głosowaniem)
//   kryzys → Pakiet kryzysowy (war room, presja czasu)

export interface ApexProductConfig {
  id: ApexProduct;
  label: string;
  shortDescription: string;
  // Skład narady: podzbiór CONSILIUM_EXPERTS (pełna dziesiątka pozostaje
  // w module /konsylium — tu narada jest jedną z pięciu warstw, więc
  // dobieramy głosy właściwe dla produktu zamiast zawsze wszystkich).
  councilRoster: ExpertId[];
  scenarioCount: number; // ile wariantów działania (plus zawsze wariant "nie robić nic")
  scenariosEmphasis: string; // wstrzykiwane do promptu scenariuszy
  decisionEmphasis: string; // wstrzykiwane do promptu decyzji
  topicPlaceholder: string;
  contextPlaceholder: string;
}

export const APEX_PRODUCTS: ApexProductConfig[] = [
  {
    id: "sdp",
    label: "Strategic Decision Package",
    shortDescription: "Pełna analiza strategiczna sprawy: od sygnału do decyzji z mapą skutków.",
    councilRoster: ["strateg", "socjolog", "narracja", "spin_doctor", "ekonomista", "red_team"],
    scenarioCount: 3,
    scenariosEmphasis:
      "Perspektywa strategiczna, nie doraźna: warianty mają różnić się realnie kierunkiem działania (zaangażować się mocno / zająć pozycję ograniczoną / przejąć temat z innej strony), nie tylko tonem. Oś czasu do 30 dni jest tu równie ważna jak pierwsze 48 godzin.",
    decisionEmphasis:
      "To jest cotygodniowy pakiet decyzyjny dla polityka. Decyzja ma budować długofalową pozycję, nie tylko wygrać najbliższą dobę. Wskaż wprost, jak decyzja wpisuje się w cel polityczny podany na wejściu.",
    topicPlaceholder: "Np. Czy i jak zająć stanowisko w sprawie rządowego projektu podatku od nadmiarowych zysków banków?",
    contextPlaceholder: "Sytuacja polityczna, co się wydarzyło, kto już zabrał głos, jaki jest kalendarz najbliższych tygodni…",
  },
  {
    id: "brief",
    label: "Brief przeddecyzyjny",
    shortDescription: "Przed wywiadem, debatą, głosowaniem: czego się spodziewać i co powiedzieć.",
    councilRoster: ["strateg", "narracja", "spin_doctor", "fact_checker", "red_team"],
    scenarioCount: 2,
    scenariosEmphasis:
      "Horyzont jest krótki: liczy się przebieg samego wydarzenia i pierwsze 48 godzin po nim. Warianty to realne linie zachowania podczas wydarzenia (np. ofensywna vs. zdyscyplinowana), nie wielotygodniowe strategie.",
    decisionEmphasis:
      "To jest brief przed konkretnym wydarzeniem. Decyzja ma być wykonalna przez jedną osobę w trakcie wydarzenia: jasna linia, trzy najtrudniejsze pytania z gotowymi odpowiedziami w counterPlays, jedno zdanie w messageLines oznaczone jako to, które ma zostać w głowach po wystąpieniu.",
    topicPlaceholder: "Np. Jutro debata w Polsat News o mieszkaniach, prowadzący znany z ostrych pytań o przeszłość w bankowości.",
    contextPlaceholder: "Format wydarzenia, kto jeszcze bierze udział, przewidywane tematy, wcześniejsze starcia z tym prowadzącym…",
  },
  {
    id: "kryzys",
    label: "Pakiet kryzysowy",
    shortDescription: "War room: narastający atak lub kryzys, plan reakcji w godzinach.",
    councilRoster: ["spin_doctor", "red_team", "prawnik", "strateg", "psycholog", "social_media"],
    scenarioCount: 3,
    scenariosEmphasis:
      "Tryb kryzysowy: wśród wariantów MUSI być odpowiedź natychmiastowa oraz świadome milczenie z przygotowaną linią na wypadek eskalacji. Dla każdego wariantu wskaż moment, w którym przestaje być dostępny (np. milczenie po 24h staje się przyznaniem).",
    decisionEmphasis:
      "Liczy się kontrola szkód i szybkość. Rozdziel działania natychmiastowe (pierwsze godziny) od odroczonych. planB ma opisywać próg eskalacji: po czym poznamy, że wariant nie działa, i co wtedy robimy. Wskaż wprost, czego NIE robić pod presją.",
    topicPlaceholder: "Np. Portal X publikuje tekst o rzekomym konflikcie interesów, temat podbijają konta dwóch partii.",
    contextPlaceholder: "Co już wyszło, co jeszcze może wyjść, ile czasu minęło, kto już zdążył zareagować…",
  },
];

export function getProduct(id: ApexProduct): ApexProductConfig {
  return APEX_PRODUCTS.find((p) => p.id === id) ?? APEX_PRODUCTS[0];
}
