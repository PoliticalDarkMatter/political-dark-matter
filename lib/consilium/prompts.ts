import { getMode } from "./modes";
import type { ExpertProfile } from "./experts";
import type { ConsiliumInput, ExpertOpinion, ResearchContext } from "./types";

// ── Biblioteka promptów — e-Konsylium ────────────────────────────────────
// Ten sam wzorzec co lib/reaction-simulator/prompts.ts: SHARED_RULES
// sklejane z blokiem kontekstu, osobna funkcja na etap. Różnica: tu etapów
// jest 11 (10 ekspertów o identycznej strukturze wyjścia + 1 synteza), więc
// zamiast 10 osobnych funkcji jest jedna buildExpertPrompt(expert, ...)
// parametryzowana profilem eksperta z experts.ts — unika to duplikowania
// tego samego szkieletu promptu dziesięć razy.

const SHARED_RULES = `Zasady, których musisz przestrzegać zawsze:
- Odpowiadasz jako jeden ekspert w gronie dziesięciu doradców politycznych analizujących ten sam temat z różnych perspektyw — twoja odpowiedź ma być zdaniem TWOJEJ specjalizacji, nie próbą pokrycia wszystkiego.
- Zero halucynacji: nie wymyślaj cytatów, wypowiedzi polityków, danych sondażowych, wyników badań, faktów medialnych, dat, nazwisk ani źródeł. Jeśli czegoś nie da się potwierdzić dostarczonym kontekstem lub researchem, powiedz to wprost jako otwarte pytanie albo lukę do sprawdzenia, nie jako fakt.
- Oddzielaj to, co wynika z dostarczonego researchu, od tego, co jest twoją interpretacją ekspercką lub hipotezą strategiczną.
- Nie twórz fałszywych danych, nie podszywaj się pod realne osoby, nie proponuj fałszywych źródeł, cytatów ani kont, nie proponuj działań o charakterze dezinformacji lub astroturfingu. Jeśli jesteś Red teamem: możesz opisać, jak temat mógłby zostać wykorzystany do manipulacji przez przeciwników — ale twoje własne rekomendacje mają być uczciwe i oparte na faktach.
- Bądź konkretny i operacyjny. Nie pisz ogólników w stylu "trzeba zachować ostrożność" bez wskazania co konkretnie zrobić lub czego unikać.
- Pisz po polsku, żywym językiem doświadczonego stratega, nie korpomową.
- Zwracaj WYŁĄCZNIE czysty JSON, bez markdown, bez bloków kodu, bez komentarzy przed lub po.`;

function inputBlock(input: ConsiliumInput, research: ResearchContext): string {
  const mode = getMode(input.mode);
  const lines = [
    input.zalozenia && input.zalozenia,
    input.zalozenia && "",
    `Tryb pracy: ${mode.label} — ${mode.shortDescription}`,
    `Temat / pytanie / dylemat: """${input.topic.slice(0, 3000)}"""`,
    input.context && `Kontekst polityczny: ${input.context}`,
    input.politicalGoal && `Cel polityka: ${input.politicalGoal}`,
    input.targetAudience && `Grupa docelowa: ${input.targetAudience}`,
    "",
    research.hasRealData
      ? `Research (realne materiały znalezione w mediach i sieci):\n${research.digest}`
      : `Research: ${research.digest}`,
  ].filter(Boolean);
  return lines.join("\n");
}

// ── Etap: opinia jednego eksperta ──────────────────────────────────────
export function buildExpertPrompt(expert: ExpertProfile, input: ConsiliumInput, research: ResearchContext): string {
  const mode = getMode(input.mode);
  return `${SHARED_RULES}

Twoja rola: ${expert.name}.
Twoja specjalizacja: ${expert.specialization}
Twoja perspektywa analityczna: ${expert.perspective}
Twój styl odpowiedzi: ${expert.responseStyle}

${inputBlock(input, research)}

Akcent trybu "${mode.label}": ${mode.synthesisEmphasis}

Pytania, na które masz odpowiedzieć ze swojej perspektywy (nie musisz cytować ich dosłownie, ale odpowiedź ma na nie realnie odpowiadać):
${expert.keyQuestions.map((q) => `- ${q}`).join("\n")}

Zwróć JSON dokładnie w tym kształcie:
{
  "headline": "jedno zdanie — sedno twojego stanowiska",
  "diagnosis": "2-4 zdania diagnozy z twojej perspektywy, konkretnie",
  "keyFindings": ["3-6 najważniejszych obserwacji"],
  "opportunities": ["0-4 szanse, jakie widzisz w tym temacie — pusta lista jeśli żadnych nie ma"],
  "risks": ["2-5 ryzyk z twojej perspektywy"],
  "recommendations": ["2-5 konkretnych, operacyjnych rekomendacji"],
  "strongestLine": "najmocniejsze, jedno zdanie z twojej perspektywy — gotowe do użycia albo do zapamiętania",
  "thingsNotToSay": ["0-4 sformułowania lub argumenty, których nie powinno się używać"],
  "openQuestions": ["0-4 pytania, na które nie znasz odpowiedzi i które trzeba sprawdzić"],
  "confidence": "low" | "medium" | "high",
  "researchNotes": {
    "usedSources": ["które elementy dostarczonego researchu realnie wykorzystałeś — pusta lista jeśli research był pusty lub nieprzydatny"],
    "missingSources": ["jakich danych/źródeł zabrakło do pełnej oceny"],
    "verificationNeeded": ["co trzeba zweryfikować przed użyciem twoich wniosków publicznie"]
  }
}
confidence ustaw na "low", jeśli opierasz się głównie na ogólnej wiedzy bez potwierdzenia w researchu; "high" tylko jeśli masz mocne oparcie w dostarczonym kontekście lub researchu.`;
}

// ── Etap: synteza ───────────────────────────────────────────────────────
// Dostaje skondensowany digest dziesięciu opinii (nie surowe obiekty),
// dokładnie tak jak buildFinalPrompt w reaction-simulator dostaje digest
// wcześniejszych etapów zamiast pełnych danych.
export function buildSynthesisPrompt(input: ConsiliumInput, research: ResearchContext, opinionsDigest: string): string {
  const mode = getMode(input.mode);
  return `${SHARED_RULES}

Twoja rola: przewodniczący e-Konsylium — scalasz stanowiska dziesięciu ekspertów w jeden protokół decyzyjny dla polityka. To NIE ma być streszczenie dziesięciu opinii, tylko decyzja: polityk czytający twoją syntezę ma w kilka sekund wiedzieć, co robić.

${inputBlock(input, research)}

Akcent trybu "${mode.label}": ${mode.synthesisEmphasis}

Poniżej skondensowane stanowiska dziesięciu ekspertów:
${opinionsDigest}

Zadanie: scal to w jeden protokół decyzyjny.

Zwróć JSON dokładnie w tym kształcie:
{
  "caseTitle": "krótki, konkretny tytuł sprawy (kilka słów)",
  "coreDiagnosis": "2-4 zdania — istota sprawy, jednoznacznie, o co naprawdę chodzi",
  "keyFindings": ["5-10 najważniejszych wniosków z całego konsylium, po synthesizowaniu, nie lista dziesięciu osobnych zdań"],
  "consensusProtocol": ["punkty, w których eksperci się zgadzają mimo różnych perspektyw — konkretnie, nie ogólnikowo"],
  "disagreementProtocol": ["punkty, w których jest napięcie między ekspertami, wraz z PRAKTYCZNYM rozstrzygnięciem: które stanowisko przeważa w tym trybie pracy i dlaczego, a nie tylko opis sporu"],
  "riskMap": {
    "political": ["ryzyka polityczne"],
    "legal": ["ryzyka prawne — pusta lista jeśli nie dotyczy"],
    "media": ["ryzyka medialne"],
    "social": ["ryzyka społeczne"],
    "economic": ["ryzyka ekonomiczne — pusta lista jeśli nie dotyczy"],
    "internet": ["ryzyka związane z internetem i social media"],
    "reputational": ["ryzyka wizerunkowe"]
  },
  "opportunityMap": ["konkretne szanse do wykorzystania — pusta lista jeśli faktycznie żadnych nie ma, nie wymyślaj na siłę"],
  "finalRecommendation": {
    "decision": "jasna, jednoznaczna decyzja — co robić. Nie lista opcji do wyboru.",
    "rationale": "2-4 zdania uzasadnienia decyzji",
    "priority": "low" | "medium" | "high" | "urgent"
  },
  "messageLines": ["3-7 gotowych do wypowiedzenia zdań, zgodnych z finalną rekomendacją"],
  "thingsNotToSay": ["sformułowania i argumenty, których należy unikać — zbiór ponad to, co już wskazali pojedynczy eksperci, jeśli synteza widzi coś dodatkowego"],
  "verificationChecklist": ["co jeszcze trzeba sprawdzić, potwierdzić lub przygotować przed publicznym użyciem tej rekomendacji"]
}
finalRecommendation.decision musi być jednoznaczna — nie kończ na liście możliwości bez wskazania najlepszego wariantu. Jeśli eksperci są głęboko podzieleni, i tak wskaż decyzję, opisując w rationale, jakie ryzyko się świadomie podejmuje.`;
}
