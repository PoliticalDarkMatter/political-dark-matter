// ── Fallbacki lokalne — Apex Grid ──────────────────────────────────────
// Ten sam wzorzec co lib/consilium/mock-generators.ts: gdy brak klucza AI
// albo odpowiedź nie przejdzie walidacji, moduł podstawia w pełni
// wypełnioną, deterministyczną strukturę zamiast pokazywać błąd lub
// półpuste UI. Mock jest JAWNIE oznaczony w wyniku (scenariosUsedFallback
// / decisionUsedFallback) — użytkownik zawsze wie, że patrzy na szkielet
// roboczy, nie na realną analizę AI.

import type { ApexInput, DecisionPackage, Scenario } from "./types";
import { getProduct } from "./products";

export function mockScenarios(input: ApexInput): Scenario[] {
  const topicShort = input.topic.slice(0, 80);
  return [
    {
      id: "A",
      label: "Zajęcie wyraźnego stanowiska",
      summary: `Polityk zabiera głos w sprawie „${topicShort}…" szybko i jednoznacznie, nadając własną ramę tematowi.`,
      opponentsReaction: "Przeciwnicy spróbują przejąć temat i sprowadzić wypowiedź do wygodnego dla siebie skrótu.",
      mediaReaction: "Media nieprzychylne wytną najbardziej podatny na atak fragment; przychylne podadzą całość ramy.",
      ownBaseReaction: "Zaplecze dostaje jasny sygnał kierunku; część sympatyków oczekuje kontynuacji, nie jednorazowej wypowiedzi.",
      timeline: {
        h48: "Pierwsza fala reakcji i kontrreakcji; rozstrzyga się, czyja rama tematu wygrywa.",
        d7: "Temat albo gaśnie, albo wchodzi w cykl komentarzy tygodniowych — potrzebny drugi krok komunikacyjny.",
        d30: "Stanowisko staje się częścią wizerunku; wraca przy każdej kolejnej odsłonie tematu.",
      },
      riskScore: 55,
      gainScore: 60,
      keyRisk: "Skrót wypowiedzi wyjęty z kontekstu żyje własnym życiem.",
      keyGain: "Pozycja gracza, który nadał ramę tematowi jako pierwszy.",
    },
    {
      id: "B",
      label: "Wejście z pozycji własnego tematu",
      summary: "Zamiast odpowiadać wprost, polityk przekierowuje uwagę na własny, przygotowany temat sąsiadujący ze sprawą.",
      opponentsReaction: "Zarzut uniku; skuteczność zarzutu zależy od siły własnego tematu.",
      mediaReaction: "Media pójdą za mocniejszym tematem — przekierowanie działa tylko z realnym konkretem w ręku.",
      ownBaseReaction: "Zaplecze przyjmie manewr, jeśli własny temat jest wyraźnie bliższy ludziom niż sprawa wyjściowa.",
      timeline: {
        h48: "Test siły przekierowania: media podchwytują własny temat albo wracają z pytaniem wyjściowym.",
        d7: "Przy powodzeniu: rozmowa toczy się na własnym boisku. Przy porażce: pytanie wraca ze zdwojoną siłą.",
        d30: "Manewr zapamiętany jako sprawność strategiczna albo jako unik — zależnie od wyniku tygodnia.",
      },
      riskScore: 45,
      gainScore: 50,
      keyRisk: "Przekierowanie bez mocnego konkretu czyta się jako ucieczka.",
      keyGain: "Rozmowa przenosi się na teren, gdzie polityk ma przewagę.",
    },
    {
      id: "D",
      label: "Nie robić nic (świadoma bezczynność)",
      summary: "Brak publicznej reakcji; monitoring tematu w Narrative Scope i przygotowana linia na wypadek eskalacji.",
      opponentsReaction: "Przy niskiej temperaturze tematu: brak paliwa. Przy wysokiej: milczenie zostanie zagrane jako przyznanie.",
      mediaReaction: "Bez nowych wypowiedzi temat traci cykl życia, chyba że podgrzeje go kto inny.",
      ownBaseReaction: "Część zaplecza może odebrać milczenie jako brak odwagi — zależnie od rangi sprawy.",
      timeline: {
        h48: "Obserwacja velocity tematu; ustalony próg, po którym bezczynność przestaje być dostępna.",
        d7: "Temat wygasa albo przekracza próg i wymusza wejście z przygotowaną linią.",
        d30: "Przy wygaśnięciu: zero kosztu. Przy eskalacji bez reakcji: koszt rośnie z każdym dniem.",
      },
      riskScore: 40,
      gainScore: 30,
      keyRisk: "Przegapienie momentu, w którym milczenie zmienia znaczenie.",
      keyGain: "Zero paliwa dla przeciwników przy temacie, który sam gaśnie.",
    },
  ];
}

export function mockDecision(input: ApexInput, scenarios: Scenario[]): DecisionPackage {
  const product = getProduct(input.product);
  const first = scenarios[0];
  return {
    caseTitle: input.topic.slice(0, 90) || "Sprawa bez tytułu",
    decision: `Szkielet roboczy (bez analizy AI): przyjmij wariant „${first?.label ?? "A"}" jako punkt wyjścia i zweryfikuj go z zespołem przed użyciem.`,
    chosenScenarioId: first?.id ?? "A",
    rationale:
      "To jest deterministyczny fallback lokalny — brak klucza AI albo odpowiedź modelu nie przeszła walidacji. Struktura pokazuje pełny kształt pakietu decyzyjnego, ale treść wymaga przebiegu z realnym modelem.",
    priority: input.product === "kryzys" ? "urgent" : "medium",
    consequenceMap: {
      political: ["Do uzupełnienia po przebiegu z realnym modelem AI."],
      media: ["Do uzupełnienia po przebiegu z realnym modelem AI."],
      social: ["Do uzupełnienia po przebiegu z realnym modelem AI."],
      internet: ["Do uzupełnienia po przebiegu z realnym modelem AI."],
    },
    messageLines: [],
    thingsNotToSay: [],
    counterPlays: [],
    planB: "Ustal z zespołem próg eskalacji i wariant awaryjny — fallback lokalny nie podejmuje tej decyzji za stratega.",
    whatWeKnow: [],
    whatWeAssume: [`Produkt: ${product.label}. Wszystkie treści tego pakietu to szkielet, nie analiza.`],
    whatToVerify: ["Uruchom analizę ponownie z dostępnym kluczem AI, zanim cokolwiek z tego pakietu trafi do użycia."],
  };
}
