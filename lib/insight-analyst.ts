import { getAIProvider } from "@/lib/reaction-simulator/ai-provider";
import type { InsightQueryResult } from "@/lib/insight";
import {
  getPersonaByGroupValue,
  buildEvidenceList,
  runGroundedTurn,
  withOpinionLayer,
  type AvatarAnswer,
  type AvatarEvidence,
} from "@/lib/insight-avatar";

// ── e-Wyborcy: tryb analityczny ("Zapytaj grupę") ─────────────────────
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

ZASADA NACZELNA: opieraj się przede wszystkim na TWARDYCH danych (dowody typu dopasowane_do_pytania i synteza). Dopiero gdy ich brakuje, schodź niżej: kontekst ogólnopolski → opinie z publicystyki. Zawsze udziel odpowiedzi.

STRUKTURA ODPOWIEDZI (zwięzła proza, nie nagłówki):
1. Bezpośrednia odpowiedź na pytanie w 1-2 zdaniach, z najmocniejszym dostępnym dowodem.
2. Twarde dane O TEJ GRUPIE - liczby dokładnie takie jak w dowodach, każda z numerem [n]. Porównuj do średniej wymiaru i innych grup, jeśli dowody to zawierają.
3. Jeśli o grupie nie ma danych wprost, użyj dowodów kontekst_spoza_grupy (ogólnopolskie): przywołaj je JAWNIE jako "w całej populacji..." i z tego wnioskuj ("Wnioskowanie: ... (wnioskuję z [2], [7])"). Liczb ogólnopolskich nie przypisuj grupie.
4. Jeśli i tego brak lub jest wątły, sięgnij po dowody opinia_z_sieci (realna publicystyka). Wprowadź je zwrotem typu "Trudno to rozstrzygnąć na twardych danych, ale w publicystyce pojawiają się opinie, że..." i ZAWSZE podaj źródło z numerem ("wg komentarza w Rzeczpospolitej [n]", "analitycy cytowani przez OKO.press [n]"). To cudze opinie, nie pomiar - tak je oznaczaj.
5. Na końcu jedno zdanie o tym, czego w danych brakuje, żeby odpowiedzieć pewniej.

ŻELAZNE ZASADY:
- Liczby, wyniki badań i konkretne nazwiska/cytaty TYLKO z dowodów. W warstwie opinii wolno przytoczyć nazwę źródła i tytuł/tezę dokładnie tak, jak w dowodzie opinia_z_sieci - nie wymyślaj żadnego publicysty, eksperta, cytatu ani liczby, których tam nie ma.
- Nigdy nie pisz, że "nie udało się złożyć analizy", że model zawiódł, ani niczego o błędach technicznych. Gdy danych mało, po prostu zejdź do warstwy opinii i wyraźnie oznacz niepewność.
- AKTUALNOŚĆ: dziś jest ${today}. Dane starsze niż rok opisuj z datą ("w lutym 2026...", "badanie z 2023 r."), nie jako stan obecny. Przy sprzecznych datach pierwszeństwo mają najnowsze.
- Gdy dowody się rozjeżdżają, powiedz to wprost.

DOWODY:
${evidenceBlock}

PYTANIE: ${question}

Odpowiedz TYLKO poprawnym JSON (bez markdown):
{"odpowiedz":"...analiza; fakty z [n]; wnioskowania z prefiksem Wnioskowanie: i (wnioskuję z [n]); opinie z sieci z nazwą źródła i [n]...","uzyte_dowody":[1,2],"pewnosc":"wysoka|srednia|niska","zastrzezenia":"czego brakuje w danych albo null"}`;
}

export async function askAnalyst(
  groupValue: string,
  question: string,
  matched: InsightQueryResult | null,
  matchedGlobal: InsightQueryResult | null = null
): Promise<AvatarAnswer> {
  const persona = await getPersonaByGroupValue(groupValue);
  const label = persona?.profile.grupa?.etykieta ?? groupValue;

  // Brak persony nie jest błędem dla użytkownika: nadal składamy odpowiedź z
  // kontekstu i opinii z sieci. Twarde dane najpierw, opinie tylko gdy ich brak.
  const baseEvidence = persona ? buildEvidenceList(persona, matched, matchedGlobal, question, 20) : [];
  const evidence = await withOpinionLayer(label, question, baseEvidence);

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
    // Fallback bez LLM: bez wzmianki o błędzie. Twarde dane najpierw, potem
    // opinie z publicystyki z nazwą źródła, jawnie oznaczone jako opinie.
    const opinions = evidence.filter((e) => e.rodzaj === "opinia_z_sieci").slice(0, 3);
    const hard = evidence.filter((e) => e.rodzaj !== "opinia_z_sieci").slice(0, 4);
    if (!evidence.length) {
      answer = `Trudno to rozstrzygnąć: o grupie „${label}" nie ma na ten temat ani twardych danych, ani danych ogólnopolskich, ani wyraźnych głosów w publicystyce. Baza uzupełnia się co noc.`;
    } else {
      const parts: string[] = [];
      if (hard.length) {
        parts.push(`Najmocniejsze dane: ` + hard.map((e) => `${e.tekst} [${e.nr}]`).join("; ") + ".");
        used = used.concat(hard.map((e) => e.nr));
      }
      if (opinions.length) {
        parts.push(
          `Trudno przesądzić to twardymi danymi, ale w publicystyce temat podejmują ` +
            opinions.map((e) => `${e.zrodlo} [${e.nr}]`).join(", ") +
            " — to opinie, nie pomiar o tej grupie."
        );
        used = used.concat(opinions.map((e) => e.nr));
      }
      answer = parts.join(" ");
    }
    confidence = "niska";
    caveats = evidence.some((e) => e.rodzaj === "opinia_z_sieci")
      ? "Brakuje twardych danych o tej grupie — część odpowiedzi opiera się na opiniach z publicystyki, nie na pomiarze."
      : null;
  }

  return {
    answer,
    confidence,
    usedEvidence: used,
    caveats,
    evidence,
    coverage: persona?.data_coverage ?? "brak",
    personaVersion: persona?.version ?? 0,
    aiReal: provider.isReal,
  };
}
