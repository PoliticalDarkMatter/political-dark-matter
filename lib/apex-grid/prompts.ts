import { getProduct } from "./products";
import type { ApexInput, CouncilContext, GroundContext, Scenario, SignalContext } from "./types";

// ── Biblioteka promptów — Apex Grid ────────────────────────────────────
// Ten sam wzorzec co lib/consilium/prompts.ts: SHARED_RULES sklejane z
// blokiem kontekstu, osobna funkcja na etap. Warstwy 1-3 nie mają tu
// promptów (Sygnał i Grunt są deterministyczne, Narada reużywa prompty
// Konsylium) — tu mieszkają tylko Scenariusze i Decyzja.

const SHARED_RULES = `Zasady, których musisz przestrzegać zawsze:
- Jesteś silnikiem analizy strategicznej dla polskiego polityka. Twoim produktem jest decyzja operacyjna, nie esej.
- Zero halucynacji: nie wymyślaj cytatów, wypowiedzi polityków, danych sondażowych, wyników badań, faktów medialnych, dat, nazwisk ani źródeł. Twarde dane masz WYŁĄCZNIE w blokach Sygnał (monitoring mediów) i Grunt (Insight Base) poniżej — wszystko ponad to jest twoją interpretacją i ma być tak traktowane.
- Przewidywania reakcji (przeciwników, mediów, grup) formułuj jako przewidywania oparte na logice politycznej, nie jako fakty. Nie przypisuj realnym osobom konkretnych przyszłych wypowiedzi w cudzysłowie.
- Nie proponuj działań o charakterze dezinformacji, astroturfingu, fałszywych kont ani podszywania się. Ostro i skutecznie — ale uczciwie i na faktach.
- Bądź konkretny i operacyjny. Nie pisz ogólników w stylu "należy zachować ostrożność" bez wskazania co konkretnie zrobić lub czego unikać.
- Pisz po polsku, żywym językiem doświadczonego stratega, nie korpomową.
- Zwracaj WYŁĄCZNIE czysty JSON, bez markdown, bez bloków kodu, bez komentarzy przed lub po.`;

function inputBlock(input: ApexInput, signal: SignalContext, ground: GroundContext, council: CouncilContext): string {
  const product = getProduct(input.product);
  const lines = [
    `Produkt: ${product.label} — ${product.shortDescription}`,
    `Sprawa / pytanie / dylemat: """${input.topic.slice(0, 3000)}"""`,
    input.context && `Kontekst polityczny: ${input.context}`,
    input.politicalGoal && `Cel polityka: ${input.politicalGoal}`,
    input.targetAudience && `Grupy, o które toczy się gra: ${input.targetAudience}`,
    "",
    `── WARSTWA 1, SYGNAŁ (monitoring mediów i sieci, dane realne) ──`,
    signal.digest,
    "",
    `── WARSTWA 2, GRUNT (Insight Base: badania o grupach, dane realne) ──`,
    ground.digest,
    "",
    `── WARSTWA 3, NARADA (opinie ekspertów Konsylium o tej sprawie) ──`,
    council.digest,
  ].filter(Boolean);
  return lines.join("\n");
}

// ── Etap: Scenariusze (warstwa 4) ──────────────────────────────────────
export function buildScenariosPrompt(
  input: ApexInput,
  signal: SignalContext,
  ground: GroundContext,
  council: CouncilContext
): string {
  const product = getProduct(input.product);
  const n = product.scenarioCount;
  return `${SHARED_RULES}

Twoje zadanie: zbuduj warianty działania dla polityka w sprawie opisanej niżej.

${inputBlock(input, signal, ground, council)}

Akcent produktu "${product.label}": ${product.scenariosEmphasis}

Wymagania:
- Dokładnie ${n + 1} scenariuszy: ${n} realne warianty działania (id "A"${n >= 2 ? ', "B"' : ""}${n >= 3 ? ', "C"' : ""}) plus ZAWSZE ostatni wariant świadomej bezczynności (id "D", label zaczynający się od "Nie robić nic") — w polityce bezczynność też jest decyzją i ma swoje skutki.
- Warianty mają się różnić kierunkiem działania, nie tylko tonem.
- opponentsReaction / mediaReaction / ownBaseReaction: przewidywana logika reakcji, bez wymyślonych cytatów.
- riskScore i gainScore: liczby 0-100, spójne z opisem (wariant opisany jako bardzo ryzykowny nie może mieć riskScore 20).
- timeline: konkretne przewidywane przebiegi, nie ogólniki.

Zwróć JSON dokładnie w tym kształcie:
{
  "scenarios": [
    {
      "id": "A",
      "label": "krótka nazwa wariantu",
      "summary": "1-3 zdania: na czym polega wariant",
      "opponentsReaction": "jak zagrają przeciwnicy",
      "mediaReaction": "jak zagrają media przychylne i nieprzychylne",
      "ownBaseReaction": "jak zareaguje własne zaplecze i sympatycy",
      "timeline": { "h48": "pierwsze 48 godzin", "d7": "pierwszy tydzień", "d30": "pierwszy miesiąc" },
      "riskScore": 55,
      "gainScore": 60,
      "keyRisk": "największe pojedyncze ryzyko wariantu",
      "keyGain": "największy pojedynczy zysk wariantu"
    }
  ]
}`;
}

// ── Etap: Decyzja (warstwa 5) ──────────────────────────────────────────
function scenariosDigest(scenarios: Scenario[]): string {
  return scenarios
    .map(
      (s) =>
        `[${s.id}] ${s.label} (ryzyko ${s.riskScore}, zysk ${s.gainScore})\n${s.summary}\nKluczowe ryzyko: ${s.keyRisk}. Kluczowy zysk: ${s.keyGain}.`
    )
    .join("\n\n");
}

export function buildDecisionPrompt(
  input: ApexInput,
  signal: SignalContext,
  ground: GroundContext,
  council: CouncilContext,
  scenarios: Scenario[]
): string {
  const product = getProduct(input.product);
  return `${SHARED_RULES}

Twoje zadanie: podejmij JEDNĄ decyzję. Wybierz najlepszy wariant spośród scenariuszy z warstwy 4 i zamień go w kompletny pakiet decyzyjny. Żadnych "możliwe są różne podejścia" — masz wskazać wariant i go uzasadnić. Jeśli eksperci narady byli podzieleni, rozstrzygnij spór i powiedz wprost, czyją perspektywę odrzucasz i dlaczego.

${inputBlock(input, signal, ground, council)}

── WARSTWA 4, SCENARIUSZE (warianty do wyboru) ──
${scenariosDigest(scenarios)}

Akcent produktu "${product.label}": ${product.decisionEmphasis}

Wymagania:
- decision: jasne zdanie rozkazujące, co robić. chosenScenarioId musi być id jednego z powyższych scenariuszy.
- counterPlays: 2-4 pary przewidywany kontratak → przygotowana odpowiedź. Kontratak opisuj jako typ zagrania, odpowiedź jako gotową linię.
- messageLines: 3-7 gotowych zdań do wypowiedzenia, język prosty i mocny, zero korpomowy. Zdania mają przejść test ulicy: konkret, nie ściema.
- thingsNotToSay: sformułowania i tematy, których użycie natychmiast obróci się przeciw politykowi, z powodem w tym samym zdaniu.
- whatWeKnow: WYŁĄCZNIE to, co realnie wynika z warstw Sygnał i Grunt. whatWeAssume: interpretacje i hipotezy. whatToVerify: co sprawdzić przed publicznym użyciem. Te trzy listy muszą być rozłączne.
- planB: po czym poznamy, że decyzja nie działa, i co wtedy robimy.

Zwróć JSON dokładnie w tym kształcie:
{
  "caseTitle": "krótki tytuł sprawy",
  "decision": "jasna decyzja: co robić",
  "chosenScenarioId": "A",
  "rationale": "zwięzłe uzasadnienie wyboru, w tym rozstrzygnięcie sporów narady",
  "priority": "low|medium|high|urgent",
  "consequenceMap": {
    "political": ["1-3 skutki polityczne"],
    "media": ["1-3 skutki medialne"],
    "social": ["1-3 skutki społeczne, per grupa jeśli dane na to pozwalają"],
    "internet": ["1-3 skutki w sieci: memy, fale komentarzy, konta partyjne"]
  },
  "messageLines": ["gotowe zdania"],
  "thingsNotToSay": ["czego nie mówić i dlaczego"],
  "counterPlays": [{ "expectedAttack": "typ kontrataku", "response": "gotowa odpowiedź" }],
  "planB": "próg i plan awaryjny",
  "whatWeKnow": ["twarde fakty z danych"],
  "whatWeAssume": ["interpretacje i hipotezy"],
  "whatToVerify": ["do sprawdzenia przed użyciem"]
}`;
}
