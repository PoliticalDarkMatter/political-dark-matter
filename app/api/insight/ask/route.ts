import { NextRequest, NextResponse } from "next/server";
import { askAnalyst } from "@/lib/insight-analyst";
import { queryInsightHybrid } from "@/lib/insight";

// "Zapytaj grupę" w trybie analitycznym: te same dowody co awatar
// (persona + fuzzy match + kontekst ogólnopolski), ale odpowiedź sztabowa
// w trzeciej osobie, z liczbami i numerami dowodów. force-dynamic
// obowiązkowe: dane w bazie zmieniają się co noc.
export const dynamic = "force-dynamic";
export const revalidate = 0;
// Warstwa opinii dociąga publicystykę z sieci, więc dajemy zapas czasu.
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { group?: string; question?: string };
    const group = body.group?.trim();
    const question = body.question?.trim();
    if (!group || !question) {
      return NextResponse.json({ error: "Podaj grupę i pytanie." }, { status: 400 });
    }

    let matched = null;
    let matchedGlobal = null;
    try {
      [matched, matchedGlobal] = await Promise.all([
        queryInsightHybrid(question, [group]),
        queryInsightHybrid(question, []),
      ]);
    } catch {
      // brak dopasowania nie blokuje odpowiedzi z profilu persony
    }

    // askAnalyst zawsze zwraca odpowiedź (opinie/kontekst nawet bez persony),
    // więc nie ma tu ścieżki "błąd/brak persony" pokazywanej użytkownikowi.
    const result = await askAnalyst(group, question, matched, matchedGlobal);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/insight/ask]", err);
    // Nie pokazujemy błędu w UI — zwracamy łagodną, pustą analizę.
    return NextResponse.json({
      answer: "Trudno w tej chwili złożyć analizę dla tej grupy. Spróbuj ponownie za moment albo zmień pytanie.",
      confidence: "niska",
      usedEvidence: [],
      caveats: null,
      evidence: [],
      coverage: "brak",
      personaVersion: 0,
      aiReal: false,
    });
  }
}
