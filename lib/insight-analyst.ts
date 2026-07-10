import { getAIProvider } from "@/lib/reaction-simulator/ai-provider";
import type { InsightQueryResult } from "@/lib/insight";
import {
  getPersonaByGroupValue,
  buildEvidenceList,
  runGroundedTurn,
  type AvatarAnswer,
  type AvatarEvidence,
} from "@/lib/insight-avatar";

// ── Insight Base: tryb analityczny ("Zapytaj grupę") ─────────────────────
// Ten sam silnik dowodowy co awatar (persona + query_insight + kontekst
// ogólnopolski), ale głos sztabowego analityka zamiast pierwszej osoby:
// liczby, porównania do średniej, jawnie oznaczone wnioskowanie i luki.
// Powstało 2026-07-09 po uwadze Jana, że "Zapytaj grupę" nie kojarzy faktów
// (było czystym dopasowaniem SQL) i kłamliwie zgłaszało brak danych, gdy
// istniały dane ogólnopolskie bez rozbicia na grupę.

function fmtDate(d?: string | null): string {
  return d ? ` (${d})` : "";
}

function buildAnalystPrompt(label: string, question: string, evidence: AvatarEvidence[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const evidenceBlock = evidence
    .map((e) => `[${e.nr}] (${e.rodzaj}) ${e.tekst} — źródło: ${e.zrodlo}${fmtDate(e.data)}`)
    .join("\n");

  return `Jesteś analitykiem sztabu politycznego. Odpowiadasz na pytanie o polską grupę społeczną: ${label}. Piszesz zwięźle, konkretnie, po polsku, w trzeciej osobie ("ta grupa", "wśród nich"), bez korpomowy.

STRUKTURA ODPOWIEDZI (zwięzła proza, nie nagłówki):
1. Najpierw bezpośrednia odpowiedź na pytanie w 1-2 zdaniach, z najmocniejszym dowodem.
2. Potem co mówią twarde dane O TEJ GRUPIE - liczby dokładnie takie jak w dowodach, każda z numerem dowodu [n]. Porównuj do średniej wymiaru i innych grup, jeśli dowody to zawierają.
3. Jeśli o grupie nie ma danych wprost, użyj dowodów oznaczonych jako kontekst_spoza_grupy (dane ogólnopolskie): przywołaj je JAWNIE jako "w całej populacji..." i dopiero z tego wnioskuj. Każde wnioskowanie zaczynaj od "Wnioskowanie:" i kończ numerami dowodów (wnioskuję z [2], [7]). Liczb ogólnopolskich nie wolno przypisywać grupie.
4. Na końcu jedno zdanie o tym, czego w danych brakuje, żeby odpowiedzieć pewniej.

ŻELAZNE ZASADY:
- Żadnych liczb, nazwisk ani zdarzeń spoza dowodów.
- AKTUALNOŚĆ: dziś jest ${today}. Dane starsze niż rok opisuj z datą ("w lutym 2026...", "badanie z 2023 r."), nie jako stan obecny. Przy sprzecznych datach pierwszeństwo mają najnowsze.
- Gdy dowody się rozjeżdżają, powiedz to wprost.
- Gdy nie ma ani danych o grupie, ani sensownego kontekstu: napisz to uczciwie i wskaż 3-5 tematów z dowodów, o które można zapytać.

DOWODY:
${evidenceBlock}

PYTANIE: ${question}

Odpowiedz TYLKO poprawnym JSON (bez markdown):
{"odpowiedz":"...analiza; fakty z [n], wnioskowania z prefiksem Wnioskowanie: i (wnioskuję z [n])...","uzyte_dowody":[1,2],"pewnosc":"wysoka|srednia|niska","zastrzezenia":"czego brakuje w danych albo null"}`;
}

export async function askAnalyst(
  groupValue: string,
  question: string,
  matched: InsightQueryResult | null,
  matchedGlobal: InsightQueryResult | null = null
): Promise<AvatarAnswer | null> {
  const persona = await getPersonaByGroupValue(groupValue);
  if (!persona) return null;

  const label = persona.profile.grupa?.etykieta ?? groupValue;
  const evidence = buildEvidenceList(persona, matched, matchedGlobal, question, 20);

  const provider = getAIProvider();
  let answer: string | null = null;
  let used: number[] = [];
  let confidence: AvatarAnswer["confidence"] = "niska";
  let caveats: string | null = null;

  if (provider.isReal && evidence.length > 0) {
    const g = await runGroundedTurn(buildAnalystPrompt(label, question, evidence), evidence.length, 0.3);
    if (g) {
      answer = g.answer;
      used = g.used;
      confidence = g.confidence;
      caveats = g.caveats;
    }
  }

  if (!answer) {
    // Fallback bez LLM: dowody są już oczyszczone, więc podajemy najmocniejsze
    // czytelnie, uczciwie oznaczając brak pełnej analizy — nie surowe tabele.
    if (!evidence.length) {
      answer = `Brak w bazie danych o grupie „${label}" na ten temat oraz danych ogólnopolskich do wnioskowania. Baza uzupełnia się co noc.`;
    } else {
      const top = evidence.slice(0, 4);
      answer =
        `Nie udało się złożyć pełnej analizy modelem. Najmocniejsze dane: ` +
        top.map((e) => `${e.tekst} [${e.nr}]`).join("; ") +
        ".";
      used = top.map((e) => e.nr);
    }
    confidence = "niska";
    caveats = provider.isReal
      ? "Model językowy nie odpowiedział poprawnie, pokazuję najmocniejsze dane."
      : "Brak klucza modelu językowego w środowisku.";
  }

  return {
    answer,
    confidence,
    usedEvidence: used,
    caveats,
    evidence,
    coverage: persona.data_coverage,
    personaVersion: persona.version,
    aiReal: provider.isReal,
  };
}
